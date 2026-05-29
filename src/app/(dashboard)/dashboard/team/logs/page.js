"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Badge, Button } from "@/shared/components";
import RoleGuard from "@/shared/components/RoleGuard";

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCost(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}

export default function TeamLogsPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <LogsContent />
    </RoleGuard>
  );
}

function LogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState({ details: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState({
    memberId: searchParams.get("memberId") || "",
    provider: searchParams.get("provider") || "",
    model: searchParams.get("model") || "",
    status: searchParams.get("status") || "",
  });
  const [providerOptions, setProviderOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  useEffect(() => {
    fetch("/api/team/members").then(r => r.ok && r.json()).then(d => {
      setMembers(d.members || []);
    }).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (filters.memberId) params.set("userId", filters.memberId);
      if (filters.provider) params.set("provider", filters.provider);
      if (filters.model) params.set("model", filters.model);
      if (filters.status) params.set("status", filters.status);

      const data = { details: [], pagination: {} };
      const res = await fetch(`/api/team/logs?${params}`);
      if (res.ok) Object.assign(data, await res.json());
      setLogs(data);

      const providers = [...new Set((data.details || []).map(l => l.provider).filter(Boolean))];
      setProviderOptions(providers);
      const statuses = [...new Set((data.details || []).map(l => l.status).filter(Boolean))];
      setStatusOptions(statuses);
    } catch {} finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, pageSize, fetchLogs]);

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  const pagination = logs?.pagination || {};
  const logDetails = logs?.details || [];

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <button className="hover:text-text-main transition-colors" onClick={() => router.push("/dashboard/team")}>Team</button>
        <span>/</span>
        <span className="text-text-main font-medium">Logs</span>
      </nav>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Request Logs</h1>
        <p className="mt-1 text-sm text-text-muted">Search and filter all request logs across your team</p>
      </div>

      <Card padding="md">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Developer</label>
            <select
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              value={filters.memberId}
              onChange={(e) => updateFilter("memberId", e.target.value)}
            >
              <option value="">All Developers</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.email || m.clerkUserId || m.id}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Provider</label>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              value={filters.provider}
              onChange={(e) => updateFilter("provider", e.target.value)}
              placeholder="e.g. openai"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Model</label>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              value={filters.model}
              onChange={(e) => updateFilter("model", e.target.value)}
              placeholder="e.g. gpt-4"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Status</label>
            <input
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
              value={filters.status}
              onChange={(e) => updateFilter("status", e.target.value)}
              placeholder="e.g. success"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon="close"
            onClick={() => {
              setFilters({ memberId: "", provider: "", model: "", status: "" });
              setPage(1);
            }}
          >
            Clear
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">Page Size</label>
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-text-muted">
            <span className="material-symbols-outlined text-[24px] animate-spin mr-2">progress_activity</span>
            Loading logs...
          </div>
        ) : logDetails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/70">
                <tr className="text-left text-text-muted">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Latency</th>
                  <th className="px-4 py-3 text-right font-medium">Tokens</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {logDetails.map((log) => (
                  <tr key={log.id} className="border-t border-border-subtle/80 hover:bg-surface-2/50">
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {log.timestamp?.slice(0, 19).replace("T", " ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{log.provider || "—"}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs font-mono">{log.model || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={log.status === "success" || log.status === "200 OK" ? "success" : log.status?.startsWith("5") ? "error" : log.status === "error" ? "error" : "warning"}
                        size="sm"
                      >
                        {log.status || "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      {log.latency?.total ? `${(log.latency.total / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      {formatTokens((log.tokens?.prompt_tokens || 0) + (log.tokens?.completion_tokens || 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      {log.tokens?.cost !== undefined ? formatCost(log.tokens.cost) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-text-muted">
            No logs found
          </div>
        )}
      </Card>

      {(pagination.totalPages > 1) && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{pagination.totalItems || 0} total entries</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-text-muted">Page {page} of {pagination.totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (pagination.totalPages || 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
