"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardSkeleton, Button, Badge, SegmentedControl } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "this-month", label: "This Month" },
];

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316"];

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n) {
  return `$${Number(n).toFixed(4)}`;
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

export default function UsageDashboardPage() {
  const { isManager } = useRole();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`/api/usage/dashboard?period=${period}`);
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
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  if (!isManager) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">bar_chart</span>
            </div>
            <h3 className="text-lg font-medium">Usage Dashboard</h3>
            <p className="text-sm text-text-muted mt-2">Only team managers can view the usage dashboard.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usage Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Team-wide analytics and cost tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
          <Button variant="secondary" size="sm" icon="refresh" onClick={fetchData}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon="download" onClick={() => exportCSV(data)}>
            CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Aggregate Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card padding="md" className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Total Tokens</p>
          <p className="text-2xl font-bold mt-1">{formatTokens(overview?.totalTokens || 0)}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {overview?.totalRequests || 0} requests
          </p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Total Cost</p>
          <p className="text-2xl font-bold mt-1">{formatCost(overview?.totalCost || 0)}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            ~${((overview?.totalCost || 0) / Math.max(overview?.totalRequests || 1, 1)).toFixed(6)}/req
          </p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">Active Devs</p>
          <p className="text-2xl font-bold mt-1">{overview?.activeDevelopers || 0}</p>
          <p className="text-[11px] text-text-muted mt-0.5">developers</p>
        </Card>
        <Card padding="md" className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide">RTK Saved</p>
          <p className="text-2xl font-bold mt-1">{formatTokens(overview?.totalRtkSaved || 0)}</p>
          <p className="text-[11px] text-text-muted mt-0.5">tokens saved</p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Time-series chart */}
        <Card padding="md">
          <h3 className="font-semibold mb-3">Token Consumption</h3>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatTokens} />
                  <Tooltip formatter={(v) => [formatTokens(v), "Tokens"]} />
                  <Bar dataKey="tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              No data for this period
            </div>
          )}
        </Card>

        {/* Model cost distribution */}
        <Card padding="md">
          <h3 className="font-semibold mb-3">Cost by Model</h3>
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
                    outerRadius={80}
                    label={({ model }) => model?.length > 15 ? `${model.slice(0, 15)}...` : model}
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
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              No data for this period
            </div>
          )}
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Provider volume table */}
        <Card padding="md">
          <h3 className="font-semibold mb-3">Provider Volume</h3>
          {providers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="pb-2 font-medium">Provider</th>
                    <th className="pb-2 font-medium text-right">Requests</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.provider} className="border-b border-border-subtle/50">
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
            <p className="text-text-muted text-sm py-8 text-center">No provider data</p>
          )}
        </Card>

        {/* Per-developer breakdown */}
        <Card padding="md">
          <h3 className="font-semibold mb-3">Developer Breakdown</h3>
          {developers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-subtle">
                    <th className="pb-2 font-medium">Developer</th>
                    <th className="pb-2 font-medium text-right">Requests</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Cost</th>
                    <th className="pb-2 font-medium text-right">RTK Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => (
                    <tr key={d.userId || d.clerkUserId} className="border-b border-border-subtle/50">
                      <td className="py-2 font-mono text-xs">
                        {d.clerkUserId ? d.clerkUserId.slice(0, 12) + "..." : d.userId?.slice(0, 12) + "..." || "Unknown"}
                      </td>
                      <td className="py-2 text-right">{d.requests}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatTokens(d.totalTokens)}</td>
                      <td className="py-2 text-right font-mono text-xs">{formatCost(d.cost)}</td>
                      <td className="py-2 text-right font-mono text-xs">
                        <span className="text-green-600">{formatTokens(d.rtkTokensSaved)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-muted text-sm py-8 text-center">No developer data</p>
          )}
        </Card>
      </div>

      {/* Model Cost Table */}
      {models.length > 0 && (
        <Card padding="md">
          <h3 className="font-semibold mb-3">Model Cost Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-subtle">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium text-right">Requests</th>
                  <th className="pb-2 font-medium text-right">Prompt Tokens</th>
                  <th className="pb-2 font-medium text-right">Completion Tokens</th>
                  <th className="pb-2 font-medium text-right">Total Tokens</th>
                  <th className="pb-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m, i) => (
                  <tr key={`${m.provider}-${m.model}-${i}`} className="border-b border-border-subtle/50">
                    <td className="py-2 font-mono text-xs max-w-[160px] truncate">{m.model}</td>
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
