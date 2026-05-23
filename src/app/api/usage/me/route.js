import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

function range(period) {
  const now = new Date();
  const days = period === "30d" ? 30 : 7;
  return new Date(now.getTime() - days * 86400000).toISOString();
}

function payload(rows) {
  const overview = rows.reduce((acc, r) => {
    acc.totalRequests += r.requests;
    acc.totalPromptTokens += r.promptTokens;
    acc.totalCompletionTokens += r.completionTokens;
    acc.totalCost += r.cost;
    return acc;
  }, { totalRequests: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalCost: 0 });
  overview.totalTokens = overview.totalPromptTokens + overview.totalCompletionTokens;
  overview.totalCost = Math.round(overview.totalCost * 10000) / 10000;
  return { overview };
}

export async function GET(request) {
  try {
    const ctx = await requireTeamContext();
    const { searchParams } = new URL(request.url);
    const start = range(searchParams.get("period") || "7d");
    const db = await getAdapter();
    const rows = await db.all(
      `SELECT provider, model, COUNT(*) requests, COALESCE(SUM(promptTokens), 0) promptTokens, COALESCE(SUM(completionTokens), 0) completionTokens, COALESCE(SUM(cost), 0) cost
       FROM usageHistory WHERE teamId = ? AND userId = ? AND timestamp >= ? GROUP BY provider, model ORDER BY requests DESC`,
      [ctx.teamId, ctx.userId, start]
    );
    const recentActivity = await db.all(
      `SELECT timestamp, provider, model, endpoint, status, promptTokens, completionTokens, cost FROM usageHistory WHERE teamId = ? AND userId = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 25`,
      [ctx.teamId, ctx.userId, start]
    );
    return NextResponse.json({ ...payload(rows), models: rows, providers: rows, chartData: [], recentActivity });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
