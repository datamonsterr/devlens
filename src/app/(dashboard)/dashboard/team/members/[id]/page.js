"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Badge, Button } from "@/shared/components";
import RoleGuard from "@/shared/components/RoleGuard";
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

const COLORS = ["#0284c7", "#06b6d4", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444"];

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCost(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}

function timeAgo(ts) {
  if (!ts) return "never";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function MetricCard({ label, value, hint, tone = "default" }) {
  const toneClass = {
    default: "text-text-main",
    success: "text-emerald-600 dark:text-emerald-300",
    warning: "text-amber-600 dark:text-amber-300",
    info: "text-blue-600 dark:text-blue-300",
  }[tone];

  return (
    <Card padding="md" className="h-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </Card>
  );
}

export default function MemberDetailPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <MemberDetailContent />
    </RoleGuard>
  );
}

function MemberDetailContent() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id;

  const [member, setMember] = useState(null);
  const [usage, setUsage] = useState(null);
  const [logs, setLogs] = useState({ details: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [logPage, setLogPage] = useState(1);
  const [logFilters, setLogFilters] = useState({});
  const [error, setError] = useState(null);

  const fetchMember = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/members/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMember(data.member || null);
        return data.member;
      }
    } catch {}
    return null;
  }, [userId]);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/members/${userId}/usage`);
      if (res.ok) setUsage(await res.json());
    } catch {}
  }, [userId]);

  const fetchLogs = useCallback(async (page = 1, filters = {}) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20", ...filters });
      const res = await fetch(`/api/team/members/${userId}/logs?${params}`);
      if (res.ok) setLogs(await res.json());
    } catch {}
  }, [userId]);

  useEffect(() => {
    Promise.all([fetchMember(), fetchUsage(), fetchLogs()])
      .finally(() => setLoading(false));
  }, [fetchMember, fetchUsage, fetchLogs]);

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300">
          Member not found
        </div>
        <Button variant="secondary" onClick={() => router.push("/dashboard/team")}>← Back to Team</Button>
      </div>
    );
  }

  const pagination = logs?.pagination || {};
  const logDetails = logs?.details || [];

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <button className="hover:text-text-main transition-colors" onClick={() => router.push("/dashboard/team")}>Team</button>
        <span>/</span>
        <span className="text-text-main font-medium truncate max-w-[200px]">{member.email || member.clerkUserId || member.id}</span>
      </nav>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" icon="arrow_back" onClick={() => router.push("/dashboard/team")}>Back</Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{member.email || member.clerkUserId || member.id}</h1>
          <p className="mt-1 text-sm text-text-muted">Developer analytics and activity</p>
        </div>
      </div>

      <Card padding="md" className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-lg font-bold text-brand-600 dark:text-brand-300">
            {(member.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{member.email || "No email"}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant={member.isActive ? "success" : "error"} size="sm" dot>{member.isActive ? "Active" : "Inactive"}</Badge>
              <span className="text-xs text-text-muted capitalize">{member.role}</span>
            </div>
          </div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="text-text-muted">API Keys:</span><span className="font-medium">{member.activeApiKeyCount || 0} active / {member.apiKeyCount || 0} total</span>
          <span className="text-text-muted">Invite Status:</span><span className="font-medium">{member.inviteStatus || (member.clerkUserId ? "onboarded" : "—")}</span>
          <span className="text-text-muted">Created:</span><span className="font-medium">{member.createdAt?.slice(0, 10) || "—"}</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Requests" value={(usage?.requests || 0).toLocaleString()} hint="Total API requests" icon="data_usage" />
        <MetricCard label="Tokens" value={formatTokens(usage?.tokens || 0)} hint={`${formatTokens(usage?.promptTokens || 0)} in / ${formatTokens(usage?.completionTokens || 0)} out`} tone="info" />
        <MetricCard label="Cost" value={formatCost(usage?.cost || 0)} hint={usage?.requests ? `~$${((usage.cost || 0) / usage.requests).toFixed(4)} avg` : "No requests"} />
        <MetricCard label="RTK Saved" value={formatTokens(usage?.rtkSaved || 0)} hint="Saved output tokens" tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="mb-4 text-sm font-semibold">Daily Usage</h3>
          {usage?.daily?.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || v} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatTokens} />
                  <Tooltip formatter={(v) => [v.toLocaleString(), "Requests"]} />
                  <Bar dataKey="requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-text-muted">No daily data</div>
          )}
        </Card>

        <Card padding="md">
          <h3 className="mb-4 text-sm font-semibold">Provider Breakdown</h3>
          {usage?.providers?.length > 0 ? (
            <div className="flex h-64 flex-col items-center sm:flex-row">
              <div className="h-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={usage.providers} dataKey="cost" nameKey="provider" innerRadius={50} outerRadius={70} paddingAngle={5}>
                      {usage.providers.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [formatCost(v), "Cost"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex w-full flex-col gap-1.5 sm:mt-0 sm:w-auto sm:min-w-[120px]">
                {usage.providers.map((p, i) => (
                  <div key={p.provider} className="flex items-center gap-2 text-xs">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{p.provider}</span>
                    <span className="ml-auto text-text-muted">{p.requests} req</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-text-muted">No provider data</div>
          )}
        </Card>
      </div>

      {usage?.models?.length > 0 && (
        <Card padding="md">
          <h3 className="mb-4 text-sm font-semibold">Model Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 text-right font-medium">Requests</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.models.map((m, i) => (
                  <tr key={i} className="border-b border-border-subtle/60">
                    <td className="max-w-[180px] truncate py-2 font-mono text-xs">{m.model}</td>
                    <td className="py-2 text-xs text-text-muted">{m.provider}</td>
                    <td className="py-2 text-right">{m.requests}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatCost(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding="md">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Recent Request Logs</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
              value={logFilters.provider || ""}
              onChange={(e) => {
                const f = { ...logFilters, provider: e.target.value || undefined };
                setLogFilters(f);
                fetchLogs(1, f);
                setLogPage(1);
              }}
            >
              <option value="">All providers</option>
              {[...new Set(logDetails.map((l) => l.provider).filter(Boolean))].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
              value={logFilters.status || ""}
              onChange={(e) => {
                const f = { ...logFilters, status: e.target.value || undefined };
                setLogFilters(f);
                fetchLogs(1, f);
                setLogPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {logDetails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Latency</th>
                  <th className="pb-2 text-right font-medium">Tokens</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {logDetails.map((log) => (
                  <tr key={log.id} className="border-b border-border-subtle/60 hover:bg-surface-2/50 cursor-pointer">
                    <td className="py-2 text-xs text-text-muted whitespace-nowrap">{log.timestamp?.slice(0, 19).replace("T", " ") || "—"}</td>
                    <td className="py-2 text-xs">{log.provider || "—"}</td>
                    <td className="max-w-[150px] truncate py-2 text-xs font-mono">{log.model || "—"}</td>
                    <td className="py-2 text-xs">
                      <Badge variant={log.status === "success" || log.status === "200 OK" ? "success" : log.status?.startsWith("5") ? "error" : "warning"} size="sm">
                        {log.status || "—"}
                      </Badge>
                    </td>
                    <td className="py-2 text-right text-xs font-mono">{log.latency?.total ? `${(log.latency.total / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="py-2 text-right text-xs font-mono">{log.tokens ? formatTokens((log.tokens.prompt_tokens || 0) + (log.tokens.completion_tokens || 0)) : "—"}</td>
                    <td className="py-2 text-right text-xs font-mono">{log.tokens?.cost !== undefined ? formatCost(log.tokens.cost) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-text-muted">No request logs</div>
        )}

        {(pagination.totalPages > 1) && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-text-muted">{pagination.totalItems || 0} total entries</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={logPage <= 1} onClick={() => { setLogPage(logPage - 1); fetchLogs(logPage - 1, logFilters); }}>Previous</Button>
              <span className="text-xs text-text-muted">Page {logPage} of {pagination.totalPages || 1}</span>
              <Button variant="secondary" size="sm" disabled={logPage >= (pagination.totalPages || 1)} onClick={() => { setLogPage(logPage + 1); fetchLogs(logPage + 1, logFilters); }}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
