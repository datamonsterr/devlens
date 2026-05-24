import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/db";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

function getPeriodStart(period) {
  if (period === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const days = period === "24h" ? 1 : period === "30d" ? 30 : period === "60d" ? 60 : 7;
  return new Date(Date.now() - days * 86400000).toISOString();
}

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const ctx = await requireTeamContext();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    if (ctx.role === "developer") {
      const db = await getAdapter();
      const dateFilterActive = period !== "all";
      const start = dateFilterActive ? getPeriodStart(period) : null;
      const params = [ctx.teamId, ctx.userId];
      let dateClause = "";
      if (start) {
        dateClause = " AND timestamp >= ?";
        params.push(start);
      }
      const row = await db.get(
        `SELECT COUNT(*) totalRequests, COALESCE(SUM(promptTokens), 0) totalPromptTokens, COALESCE(SUM(completionTokens), 0) totalCompletionTokens, COALESCE(SUM(cost), 0) totalCost FROM usageHistory WHERE teamId = ? AND userId = ?${dateClause}`,
        params
      );
      return NextResponse.json({ ...row, totalTokens: row.totalPromptTokens + row.totalCompletionTokens });
    }

    const stats = await getUsageStats(period);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] Failed to get usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
