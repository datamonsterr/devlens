import { NextResponse } from "next/server";
import { getChartData } from "@/lib/db";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d"]);

function getPeriodStart(period) {
  if (period === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const days = period === "24h" ? 1 : period === "30d" ? 30 : period === "60d" ? 60 : 7;
  return new Date(Date.now() - days * 86400000).toISOString();
}

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
      const start = getPeriodStart(period);
      const rows = await db.all(
        `SELECT date(timestamp) label, COALESCE(SUM(promptTokens + completionTokens), 0) tokens, COALESCE(SUM(cost), 0) cost FROM usageHistory WHERE teamId = ? AND userId = ? AND timestamp >= ? GROUP BY date(timestamp) ORDER BY label ASC`,
        [ctx.teamId, ctx.userId, start]
      );
      return NextResponse.json(rows);
    }

    const data = await getChartData(period);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Failed to get chart data:", error);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
