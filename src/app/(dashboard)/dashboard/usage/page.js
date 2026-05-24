"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardSkeleton, Button, SegmentedControl } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "this-month", label: "This Month" },
];

const COLORS = ["#0284c7", "#06b6d4", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444"];

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCost(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}

function exportCSV(data) {
  const headers = ["Label", "Tokens", "Cost", "Requests"];
  const rows = data.chartData.map((d) => [d.label, d.tokens, d.cost.toFixed(4), d.requests]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devlens-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({ label, value, hint, tone = "default" }) {
  const toneClass = {
    default: "text-text-main",
    success: "text-emerald-600 dark:text-emerald-300",
    warning: "text-amber-600 dark:text-amber-300",
  }[tone];

  return (
    <Card padding="md" className="h-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </Card>
  );
}

function EmptyChart({ message }) {
  return <div className="flex h-64 items-center justify-center text-sm text-text-muted">{message}</div>;
}

export default function UsageDashboardPage() {
  const { isManager, isDeveloper } = useRole();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const endpoint = isDeveloper ? "/api/usage/me" : "/api/usage/dashboard";
      const res = await fetch(`${endpoint}?period=${period}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load dashboard");
      }
      setData(await res.json());
    } catch (err) {
      if (err.message.includes("Insufficient") || err.message.includes("Team context")) {
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [period, isDeveloper]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const overview = data?.overview;
  const chartData = data?.chartData || [];
  const models = data?.models || [];
  const providers = data?.providers || [];
  const developers = data?.developers || [];

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isManager ? "Team Usage Analytics" : "My Usage Analytics"}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isManager
              ? "Team-level request volume, cost distribution, and Developer trends"
              : "Your personal request volume, costs, and token usage trends"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl options={PERIODS} value={period} onChange={setPeriod} size="sm" />
          <Button variant="secondary" size="sm" icon="refresh" onClick={fetchData}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon="download" onClick={() => exportCSV(data)}>
            CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Tokens"
          value={formatTokens(overview?.totalTokens || 0)}
          hint={`${overview?.totalRequests || 0} requests`}
        />
        <MetricCard
          label="Total Cost"
          value={formatCost(overview?.totalCost || 0)}
          hint={`~$${((overview?.totalCost || 0) / Math.max(overview?.totalRequests || 1, 1)).toFixed(6)} per request`}
        />
        <MetricCard
          label={isManager ? "Active Developers" : "Active Days"}
          value={String(overview?.activeDevelopers || 0)}
          hint={isManager ? "Developers with recent requests" : "Days with request activity"}
          tone="warning"
        />
        <MetricCard
          label="RTK Saved"
          value={formatTokens(overview?.totalRtkSaved || 0)}
          hint="Saved output tokens"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="mb-3 text-sm font-semibold">Token Consumption</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatTokens} />
                  <Tooltip formatter={(v) => [formatTokens(v), "Tokens"]} />
                  <Bar dataKey="tokens" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No data for this period" />
          )}
        </Card>

        <Card padding="md">
          <h3 className="mb-3 text-sm font-semibold">Cost by Model</h3>
          {models.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={models.slice(0, 8)}
                    dataKey="cost"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={84}
                    label={({ model }) => (model?.length > 15 ? `${model.slice(0, 15)}...` : model)}
                  >
                    {models.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCost(v), "Cost"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No model cost data for this period" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="mb-3 text-sm font-semibold">Provider Volume</h3>
          {providers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-text-muted">
                    <th className="pb-2 font-medium">Provider</th>
                    <th className="pb-2 text-right font-medium">Requests</th>
                    <th className="pb-2 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.provider} className="border-b border-border-subtle/60">
                      <td className="py-2 font-mono text-xs">{p.provider}</td>
                      <td className="py-2 text-right">{p.requests}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatTokens(p.totalTokens)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatCost(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">No provider data</p>
          )}
        </Card>

        <Card padding="md">
          <h3 className="mb-3 text-sm font-semibold">{isManager ? "Developer Breakdown" : "Request Breakdown"}</h3>
          {developers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-text-muted">
                    <th className="pb-2 font-medium">Developer</th>
                    <th className="pb-2 text-right font-medium">Requests</th>
                    <th className="pb-2 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                    <th className="pb-2 text-right font-medium">RTK Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => (
                    <tr key={d.userId || d.clerkUserId} className="border-b border-border-subtle/60">
                      <td className="py-2 font-mono text-xs">
                        {d.clerkUserId
                          ? `${d.clerkUserId.slice(0, 12)}...`
                          : d.userId
                            ? `${d.userId.slice(0, 12)}...`
                            : "Unknown"}
                      </td>
                      <td className="py-2 text-right">{d.requests}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatTokens(d.totalTokens)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatCost(d.cost)}</td>
                      <td className="py-2 text-right font-mono text-xs text-emerald-600 dark:text-emerald-300">
                        {formatTokens(d.rtkTokensSaved)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-text-muted">No developer data</p>
          )}
        </Card>
      </div>

      {models.length > 0 && (
        <Card padding="md">
          <h3 className="mb-3 text-sm font-semibold">Model Cost Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 text-right font-medium">Requests</th>
                  <th className="pb-2 text-right font-medium">Prompt</th>
                  <th className="pb-2 text-right font-medium">Completion</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr key={`${m.provider}-${m.model}-${i}`} className="border-b border-border-subtle/60">
                    <td className="max-w-[180px] truncate py-2 font-mono text-xs">{m.model}</td>
                    <td className="py-2 text-xs text-text-muted">{m.provider}</td>
                    <td className="py-2 text-right">{m.requests}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatTokens(m.promptTokens)}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatTokens(m.completionTokens)}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatTokens(m.totalTokens)}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatCost(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
