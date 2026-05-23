import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { parseJson } from "@/lib/db/helpers/jsonCol";

export const dynamic = "force-dynamic";

function getDateRange(period) {
  const now = new Date();
  const end = now.toISOString();

  const days = {
    "7d": 7,
    "30d": 30,
    "this-month": () => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString(), end, bucketCount: now.getDate(), label: "daily" };
    },
  };

  if (typeof days[period] === "function") return days[period]();

  const count = days[period] || 7;
  const start = new Date(now.getTime() - count * 86400000);
  return { start: start.toISOString(), end, bucketCount: count, label: "daily" };
}

export async function GET(request) {
  try {
    const ctx = await requireManagerContext();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const { start, end, bucketCount } = getDateRange(period);

    const adapter = await getAdapter();

    // Aggregate stats
    const agg = await adapter.get(
      `SELECT
        COUNT(*) as totalRequests,
        COALESCE(SUM(promptTokens), 0) as totalPromptTokens,
        COALESCE(SUM(completionTokens), 0) as totalCompletionTokens,
        COALESCE(SUM(cost), 0) as totalCost,
        COALESCE(SUM(rtkTokensSaved), 0) as totalRtkSaved
      FROM usageHistory
      WHERE teamId = ? AND timestamp >= ?`,
      [ctx.teamId, start]
    );

    // Active developers count
    const activeDevs = await adapter.get(
      `SELECT COUNT(DISTINCT userId) as count FROM usageHistory WHERE teamId = ? AND timestamp >= ? AND userId IS NOT NULL`,
      [ctx.teamId, start]
    );

    // Per-developer breakdown
    const developerRows = await adapter.all(
      `SELECT
        uh.userId,
        u.clerkUserId,
        COUNT(*) as requests,
        COALESCE(SUM(uh.promptTokens), 0) as promptTokens,
        COALESCE(SUM(uh.completionTokens), 0) as completionTokens,
        COALESCE(SUM(uh.cost), 0) as cost,
        COALESCE(SUM(uh.rtkTokensSaved), 0) as rtkTokensSaved
      FROM usageHistory uh
      LEFT JOIN users u ON uh.userId = u.id
      WHERE uh.teamId = ? AND uh.timestamp >= ?
      GROUP BY uh.userId
      ORDER BY cost DESC`,
      [ctx.teamId, start]
    );

    // Per-model cost distribution
    const modelRows = await adapter.all(
      `SELECT
        model,
        provider,
        COUNT(*) as requests,
        COALESCE(SUM(promptTokens), 0) as promptTokens,
        COALESCE(SUM(completionTokens), 0) as completionTokens,
        COALESCE(SUM(cost), 0) as cost
      FROM usageHistory
      WHERE teamId = ? AND timestamp >= ?
      GROUP BY provider, model
      ORDER BY cost DESC`,
      [ctx.teamId, start]
    );

    // Per-provider volume
    const providerRows = await adapter.all(
      `SELECT
        provider,
        COUNT(*) as requests,
        COALESCE(SUM(promptTokens), 0) as promptTokens,
        COALESCE(SUM(completionTokens), 0) as completionTokens,
        COALESCE(SUM(cost), 0) as cost
      FROM usageHistory
      WHERE teamId = ? AND timestamp >= ?
      GROUP BY provider
      ORDER BY requests DESC`,
      [ctx.teamId, start]
    );

    // Time-series chart data (daily buckets)
    const chartData = await getChartData(adapter, ctx.teamId, start, bucketCount);

    const recentActivity = await adapter.all(
      `SELECT timestamp, userId, provider, model, endpoint, status, promptTokens, completionTokens, cost
       FROM usageHistory WHERE teamId = ? AND timestamp >= ? ORDER BY timestamp DESC LIMIT 25`,
      [ctx.teamId, start]
    );

    return NextResponse.json({
      period,
      overview: {
        totalRequests: agg?.totalRequests || 0,
        totalTokens: (agg?.totalPromptTokens || 0) + (agg?.totalCompletionTokens || 0),
        totalPromptTokens: agg?.totalPromptTokens || 0,
        totalCompletionTokens: agg?.totalCompletionTokens || 0,
        totalCost: Math.round((agg?.totalCost || 0) * 10000) / 10000,
        totalRtkSaved: agg?.totalRtkSaved || 0,
        activeDevelopers: activeDevs?.count || 0,
      },
      developers: developerRows.map((d) => ({
        userId: d.userId,
        clerkUserId: d.clerkUserId,
        requests: d.requests,
        promptTokens: d.promptTokens,
        completionTokens: d.completionTokens,
        totalTokens: d.promptTokens + d.completionTokens,
        cost: Math.round(d.cost * 10000) / 10000,
        rtkTokensSaved: d.rtkTokensSaved,
      })),
      models: modelRows.map((m) => ({
        model: m.model,
        provider: m.provider,
        requests: m.requests,
        promptTokens: m.promptTokens,
        completionTokens: m.completionTokens,
        totalTokens: m.promptTokens + m.completionTokens,
        cost: Math.round(m.cost * 10000) / 10000,
      })),
      providers: providerRows.map((p) => ({
        provider: p.provider,
        requests: p.requests,
        promptTokens: p.promptTokens,
        completionTokens: p.completionTokens,
        totalTokens: p.promptTokens + p.completionTokens,
        cost: Math.round(p.cost * 10000) / 10000,
      })),
      chartData,
      recentActivity,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[Dashboard] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getChartData(adapter, teamId, startDate, bucketCount) {
  const today = new Date();
  const endDate = today.toISOString();

  const rows = await adapter.all(
    `SELECT timestamp, promptTokens, completionTokens, cost FROM usageHistory
     WHERE teamId = ? AND timestamp >= ?
     ORDER BY timestamp ASC`,
    [teamId, startDate]
  );

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (bucketCount - 1 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, tokens: 0, cost: 0, requests: 0 };
  });

  const startMs = new Date(startDate).getTime();
  const nowMs = today.getTime();
  const totalMs = nowMs - startMs;

  for (const r of rows) {
    const t = new Date(r.timestamp).getTime();
    if (t < startMs) continue;
    const idx = Math.min(Math.floor(((t - startMs) / totalMs) * bucketCount), bucketCount - 1);
    if (idx >= 0 && idx < bucketCount) {
      buckets[idx].tokens += (r.promptTokens || 0) + (r.completionTokens || 0);
      buckets[idx].cost += r.cost || 0;
      buckets[idx].requests += 1;
    }
  }

  return buckets;
}
