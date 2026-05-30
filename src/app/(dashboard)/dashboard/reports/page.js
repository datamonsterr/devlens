"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
];

function formatDateOnly(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeRange(period, customStart, customEnd) {
  const now = new Date();
  const today = formatDateOnly(now);

  if (period === "today") {
    return { startDate: today, endDate: today };
  }

  if (period === "7d") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    return { startDate: formatDateOnly(start), endDate: today };
  }

  if (period === "30d") {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 29);
    return { startDate: formatDateOnly(start), endDate: today };
  }

  return {
    startDate: customStart,
    endDate: customEnd,
  };
}

function formatTokens(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatCost(value) {
  return `$${Number(value || 0).toFixed(4)}`;
}

function badgeForClassification(classification) {
  if (classification === "high_performer") return "success";
  if (classification === "efficient_user") return "info";
  if (classification === "heavy_but_effective") return "primary";
  if (classification === "heavy_and_wasteful") return "warning";
  if (classification === "low_usage") return "default";
  return "default";
}

function badgeForRiskSeverity(severity) {
  if (severity === "critical") return "error";
  if (severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "info";
}

function badgeForPriority(priority) {
  if (priority === "high") return "error";
  if (priority === "medium") return "warning";
  return "info";
}

function MetricCard({ label, value, hint }) {
  return (
    <Card padding="md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-main">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </Card>
  );
}

export default function AIROIReportPage() {
  const { isManager, isLoaded } = useRole();
  const [period, setPeriod] = useState("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [report, setReport] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFilters() {
      try {
        setLoadingFilters(true);

        const [teamRes, membersRes] = await Promise.all([
          fetch("/api/team"),
          fetch("/api/team/members"),
        ]);

        if (!teamRes.ok) throw new Error("Failed to load Team context");
        const teamData = await teamRes.json();
        if (!cancelled) setTeam(teamData.team || null);

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          const rows = Array.isArray(membersData.members) ? membersData.members : [];
          if (!cancelled) {
            setMembers(rows);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load report filters");
        }
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMembersSet = useMemo(
    () => new Set(selectedMemberIds),
    [selectedMemberIds]
  );

  function toggleMember(memberId) {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) return prev.filter((id) => id !== memberId);
      return [...prev, memberId];
    });
  }

  async function handleGenerate() {
    setError(null);

    const range = computeRange(period, customStart, customEnd);
    if (!range.startDate || !range.endDate) {
      setError("Select both start and end date for custom range");
      return;
    }

    if (range.startDate > range.endDate) {
      setError("Custom range is invalid: start date must be before end date");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/reports/ai-roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          teamId: team?.id || undefined,
          memberIds: selectedMemberIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      setReport(data.report || null);
      setSource(data.source || null);
    } catch (e) {
      setError(e.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  const wasteSignals = useMemo(() => {
    if (!report?.member_rankings) return [];
    return report.member_rankings
      .flatMap((member) =>
        (member.waste_signals || []).map((signal) => ({
          member_name: member.member_name,
          member_id: member.member_id,
          signal,
        }))
      )
      .slice(0, 12);
  }, [report]);

  if (!isLoaded) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="h-24 animate-pulse" />
        <Card className="h-32 animate-pulse" />
        <Card className="h-64 animate-pulse" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <Card padding="lg">
        <h1 className="text-xl font-semibold text-text-main">AI ROI Report</h1>
        <p className="mt-2 text-sm text-text-muted">Only Manager role can generate Team ROI reports.</p>
      </Card>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-main">AI ROI Report</h1>
        <p className="mt-1 text-sm text-text-muted">
          Generate Team-level ROI analysis for AI-assisted coding usage, quality, and risk signals.
        </p>
      </div>

      <Card padding="md">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={period === option.value ? "primary" : "secondary"}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {period === "custom" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-main">
                Start date
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-main"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-main">
                End date
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-text-main"
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1.2fr]">
            <div className="rounded-xl border border-border-subtle bg-bg p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Team Scope</p>
              <p className="mt-1 text-sm text-text-main">{team?.name || "Current Team"}</p>
              <p className="text-xs text-text-muted">{team?.id || "Team ID unavailable"}</p>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">Member Filter</p>
                <span className="text-xs text-text-muted">
                  {selectedMemberIds.length > 0
                    ? `${selectedMemberIds.length} selected`
                    : "All members"}
                </span>
              </div>

              <div className="mt-2 max-h-36 overflow-y-auto pr-1">
                {loadingFilters ? (
                  <p className="text-sm text-text-muted">Loading members...</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-text-muted">No Team members found.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-text-main hover:border-border-subtle hover:bg-surface"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembersSet.has(member.id)}
                          onChange={() => toggleMember(member.id)}
                        />
                        <span className="truncate">{member.email || member.clerkUserId || member.id}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              icon="analytics"
              onClick={handleGenerate}
              loading={loading}
              disabled={loading || (period === "custom" && (!customStart || !customEnd))}
            >
              {loading ? "Generating Report" : "Generate Report"}
            </Button>
            {source && report && (
              <Badge variant={source === "ai" ? "success" : "warning"}>
                Source: {source === "ai" ? "AI JSON" : "Fallback"}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <Card padding="md" className="border-red-500/30">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-300">
            <span className="material-symbols-outlined">error</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        </Card>
      )}

      {!report && !loading && (
        <Card padding="lg" className="text-center">
          <p className="text-base font-semibold text-text-main">No report generated yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Select filters and click <strong>Generate Report</strong> to create AI ROI insights.
          </p>
        </Card>
      )}

      {loading && (
        <Card padding="lg" className="text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-2xl text-brand-600">progress_activity</span>
            <p className="text-sm text-text-muted">Building context and generating report...</p>
          </div>
        </Card>
      )}

      {report && (
        <>
          <Card padding="md" title="Executive Summary" icon="summarize">
            <p className="text-lg font-semibold text-text-main">{report.executive_summary?.headline}</p>
            <p className="mt-2 text-sm text-text-muted">{report.executive_summary?.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="primary">Assessment: {report.executive_summary?.overall_assessment}</Badge>
              <Badge variant="success">Top Positive: {report.executive_summary?.top_positive_insight}</Badge>
              <Badge variant="warning">Top Negative: {report.executive_summary?.top_negative_insight}</Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Team ROI Score"
              value={String(report.team_roi?.score ?? 0)}
              hint={`Grade ${report.team_roi?.grade || "N/A"}`}
            />
            <MetricCard
              label="Estimated AI Cost"
              value={formatCost(report.team_roi?.estimated_ai_cost || 0)}
              hint={report.team_roi?.cost_efficiency_summary || "-"}
            />
            <MetricCard
              label="Total Requests"
              value={String(report.usage_overview?.total_requests || 0)}
              hint={`${formatTokens(report.usage_overview?.total_tokens || 0)} total tokens`}
            />
            <MetricCard
              label="Average Tokens / Request"
              value={formatTokens(report.usage_overview?.average_tokens_per_request || 0)}
              hint={`Scope: ${report.scope?.member_count || 0} member(s)`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card padding="md" title="AI Usage Overview" icon="query_stats">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-bg p-3">
                  <p className="text-text-muted">Input Tokens</p>
                  <p className="mt-1 font-mono text-text-main">{formatTokens(report.usage_overview?.total_input_tokens || 0)}</p>
                </div>
                <div className="rounded-lg bg-bg p-3">
                  <p className="text-text-muted">Output Tokens</p>
                  <p className="mt-1 font-mono text-text-main">{formatTokens(report.usage_overview?.total_output_tokens || 0)}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-text-main">Most Used Models</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle text-left text-text-muted">
                        <th className="pb-2 font-medium">Model</th>
                        <th className="pb-2 text-right font-medium">Requests</th>
                        <th className="pb-2 text-right font-medium">Tokens</th>
                        <th className="pb-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.usage_overview?.most_used_models || []).map((item, index) => (
                        <tr key={`${item.model}-${index}`} className="border-b border-border-subtle/60">
                          <td className="max-w-[200px] truncate py-2 font-mono text-xs text-text-main">{item.model}</td>
                          <td className="py-2 text-right text-text-main">{item.requests}</td>
                          <td className="py-2 text-right font-mono text-xs text-text-main">{formatTokens(item.tokens)}</td>
                          <td className="py-2 text-right font-mono text-xs text-text-main">{formatCost(item.estimated_cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            <Card padding="md" title="Task Type Distribution" icon="hub">
              {(report.chart_data?.task_type_distribution || []).length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.chart_data.task_type_distribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="task_type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="tokens" fill="#0284c7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-text-muted">No task type distribution available.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {(report.usage_overview?.top_task_types || []).map((task, index) => (
                  <Badge key={`${task.task_type}-${index}`} variant={task.roi_signal === "negative" ? "warning" : task.roi_signal === "positive" ? "success" : "info"}>
                    {task.task_type}: {task.requests}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>

          <Card padding="md" title="Member Performance Ranking" icon="leaderboard">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-text-muted">
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Classification</th>
                    <th className="pb-2 text-right font-medium">ROI</th>
                    <th className="pb-2 text-right font-medium">Tokens</th>
                    <th className="pb-2 text-right font-medium">Cost</th>
                    <th className="pb-2 text-right font-medium">PRs Merged</th>
                    <th className="pb-2 text-right font-medium">Review Cycles</th>
                    <th className="pb-2 font-medium">Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.member_rankings || []).map((member) => (
                    <tr key={member.member_id} className="border-b border-border-subtle/60 align-top">
                      <td className="py-2">
                        <p className="font-medium text-text-main">{member.member_name}</p>
                        <p className="text-xs text-text-muted">{member.role || "-"}</p>
                      </td>
                      <td className="py-2"><Badge variant={badgeForClassification(member.classification)}>{member.classification}</Badge></td>
                      <td className="py-2 text-right font-mono text-xs text-text-main">{member.roi_score}</td>
                      <td className="py-2 text-right font-mono text-xs text-text-main">{formatTokens(member.total_tokens)}</td>
                      <td className="py-2 text-right font-mono text-xs text-text-main">{formatCost(member.estimated_cost)}</td>
                      <td className="py-2 text-right text-text-main">{member.prs_merged}</td>
                      <td className="py-2 text-right text-text-main">{member.review_cycles ?? "-"}</td>
                      <td className="py-2 text-xs text-text-muted">
                        {(member.waste_signals || []).slice(0, 2).map((signal, index) => (
                          <p key={index}>• {signal}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card padding="md" title="Token & Cost Waste Signals" icon="warning">
              {wasteSignals.length === 0 ? (
                <p className="text-sm text-text-muted">No explicit waste signals found in current report.</p>
              ) : (
                <div className="space-y-2">
                  {wasteSignals.map((item, index) => (
                    <div key={`${item.member_id}-${index}`} className="rounded-lg border border-border-subtle bg-bg px-3 py-2 text-sm">
                      <p className="font-medium text-text-main">{item.member_name}</p>
                      <p className="text-text-muted">{item.signal}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card padding="md" title="Coding Outcome Correlation" icon="insights">
              <p className="text-sm text-text-main">{report.coding_outcome_correlation?.summary}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-lg bg-bg p-3">
                  <p className="font-semibold text-text-main">Positive</p>
                  {(report.coding_outcome_correlation?.positive_correlations || []).length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-text-muted">
                      {report.coding_outcome_correlation.positive_correlations.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-text-muted">No positive correlation provided.</p>
                  )}
                </div>

                <div className="rounded-lg bg-bg p-3">
                  <p className="font-semibold text-text-main">Negative</p>
                  {(report.coding_outcome_correlation?.negative_correlations || []).length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-text-muted">
                      {report.coding_outcome_correlation.negative_correlations.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-text-muted">No negative correlation provided.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card padding="md" title="Risk Signals" icon="security">
            {(report.risk_signals || []).length === 0 ? (
              <p className="text-sm text-text-muted">No risk signals detected in this period.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {report.risk_signals.map((risk, index) => (
                  <div key={`${risk.type}-${index}`} className="rounded-lg border border-border-subtle bg-bg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-text-main">{risk.title}</p>
                      <Badge variant={badgeForRiskSeverity(risk.severity)}>{risk.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">Type: {risk.type}</p>
                    <p className="mt-2 text-sm text-text-main">{risk.description}</p>
                    <p className="mt-2 text-xs text-text-muted">Affected: {(risk.affected_members || []).join(", ") || "-"}</p>
                    <p className="mt-2 text-xs text-text-main">Action: {risk.recommended_action}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md" title="Recommendations / Action Items" icon="checklist">
            {(report.recommendations || []).length === 0 ? (
              <p className="text-sm text-text-muted">No recommendations generated.</p>
            ) : (
              <div className="space-y-2">
                {report.recommendations.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border-subtle bg-bg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text-main">{item.title}</p>
                      <Badge variant={badgeForPriority(item.priority)}>{item.priority}</Badge>
                      <Badge variant="default">owner: {item.owner}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-main">{item.description}</p>
                    <p className="mt-2 text-xs text-text-muted">Expected impact: {item.expected_impact}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding="md" title="Data Quality Notes" icon="info">
            {(report.data_quality_notes || []).length === 0 ? (
              <p className="text-sm text-text-muted">No data quality issues noted.</p>
            ) : (
              <div className="space-y-2">
                {report.data_quality_notes.map((note, index) => (
                  <div key={`${note.field}-${index}`} className="rounded-lg border border-border-subtle bg-bg p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={note.issue === "missing" ? "warning" : "info"}>{note.issue}</Badge>
                      <p className="text-sm font-semibold text-text-main">{note.field}</p>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{note.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
