"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardSkeleton, Badge } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
}

function formatCost(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}

function StatCard({ label, value, hint, icon }) {
  return (
    <Card padding="md" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-text-main">{value}</p>
          {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-200">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
      </div>
    </Card>
  );
}

function QuickLink({ href, title, desc, icon, badge }) {
  return (
    <Link href={href} className="group">
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-text-main">{title}</h3>
              {badge ? <Badge size="sm">{badge}</Badge> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-text-muted">{desc}</p>
          </div>
          <span className="material-symbols-outlined text-brand-600 dark:text-brand-300">{icon}</span>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardHomeClient() {
  const { isLoaded, isManager, isDeveloper } = useRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tunnel, setTunnel] = useState(null);
  const [refreshingTunnel, setRefreshingTunnel] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    let mounted = true;

    async function loadManagerSummary() {
      const [usageRes, teamRes, poolRes, modelsRes] = await Promise.allSettled([
        fetch("/api/usage/dashboard?period=7d"),
        fetch("/api/team/members"),
        fetch("/api/team/rtk-pool"),
        fetch("/api/models/browse"),
      ]);

      const usage = usageRes.status === "fulfilled" && usageRes.value.ok
        ? await usageRes.value.json()
        : null;
      const team = teamRes.status === "fulfilled" && teamRes.value.ok
        ? await teamRes.value.json()
        : null;
      const pool = poolRes.status === "fulfilled" && poolRes.value.ok
        ? await poolRes.value.json()
        : null;
      const models = modelsRes.status === "fulfilled" && modelsRes.value.ok
        ? await modelsRes.value.json()
        : null;

      return {
        role: "manager",
        usage: usage?.overview || null,
        members: team?.members || [],
        pool: pool || null,
        models,
      };
    }

    async function loadDeveloperSummary() {
      const [usageRes, modelsRes] = await Promise.allSettled([
        fetch("/api/usage/me?period=7d"),
        fetch("/api/models/browse"),
      ]);

      const usage = usageRes.status === "fulfilled" && usageRes.value.ok
        ? await usageRes.value.json()
        : null;
      const models = modelsRes.status === "fulfilled" && modelsRes.value.ok
        ? await modelsRes.value.json()
        : null;

      return {
        role: "developer",
        usage: usage?.overview || null,
        models,
      };
    }

    async function load() {
      try {
        setError(null);
        setLoading(true);
        const data = isManager ? await loadManagerSummary() : await loadDeveloperSummary();
        if (mounted) setSummary(data);
      } catch (err) {
        if (mounted) setError(err?.message || "Failed to load dashboard summary");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [isLoaded, isManager, isDeveloper]);

  async function refreshTunnelUrl() {
    setRefreshingTunnel(true);
    try {
      const res = await fetch("/api/tunnel/enable", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (data?.publicUrl) setTunnel(data);
      else {
        const statusRes = await fetch("/api/tunnel/status", { cache: "no-store" });
        const status = await statusRes.json().catch(() => null);
        if (status?.tunnel?.publicUrl) setTunnel(status.tunnel);
      }
    } finally {
      setRefreshingTunnel(false);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    fetch("/api/tunnel/status", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setTunnel(data?.tunnel || null))
      .catch(() => setTunnel(null));
  }, [isLoaded]);

  const stats = useMemo(() => {
    if (!summary) return [];

    if (summary.role === "manager") {
      const activeMembers = summary.members.filter((m) => m.isActive).length;
      const providerCount = (summary.models?.providers || []).length;
      const comboCount = (summary.models?.combos || []).length;

      return [
        {
          label: "7d Requests",
          value: String(summary.usage?.totalRequests || 0),
          hint: `${formatTokens(summary.usage?.totalTokens || 0)} total tokens`,
          icon: "swap_horiz",
        },
        {
          label: "7d Spend",
          value: formatCost(summary.usage?.totalCost || 0),
          hint: `${formatTokens(summary.usage?.totalRtkSaved || 0)} RTK tokens saved`,
          icon: "payments",
        },
        {
          label: "Team Members",
          value: String(activeMembers),
          hint: `${summary.members.length} total records`,
          icon: "groups",
        },
        {
          label: "Routing Inventory",
          value: String(providerCount + comboCount),
          hint: `${providerCount} providers, ${comboCount} combos`,
          icon: "hub",
        },
      ];
    }

    const modelCount = (summary.models?.providers || []).reduce((acc, p) => acc + (p.models?.length || 0), 0);

    return [
      {
        label: "7d Requests",
        value: String(summary.usage?.totalRequests || 0),
        hint: `${formatTokens(summary.usage?.totalTokens || 0)} total tokens`,
        icon: "swap_horiz",
      },
      {
        label: "7d Spend",
        value: formatCost(summary.usage?.totalCost || 0),
        hint: `${formatTokens(summary.usage?.totalRtkSaved || 0)} RTK tokens saved`,
        icon: "payments",
      },
      {
        label: "CLI Config",
        value: "Ready",
        hint: "Copy tool snippets from portal",
        icon: "terminal",
      },
      {
        label: "Available Models",
        value: String(modelCount),
        hint: `${(summary.models?.combos || []).length} team combos`,
        icon: "hub",
      },
    ];
  }, [summary]);

  if (!isLoaded || loading) {
    return (
      <div className="flex min-w-0 flex-col gap-4">
        <CardSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const roleLabel = isManager ? "Manager Portal" : isDeveloper ? "Developer Portal" : "Portal";

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <Card className="relative overflow-hidden" padding="lg" elev>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_right_top,rgba(14,165,233,0.2),transparent_55%)]" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="primary" size="sm">{roleLabel}</Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Portal Overview</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              {isManager
                ? "Monitor Team usage, manage infrastructure, and keep provider/model routing healthy."
                : "Track personal usage, manage your API Keys, and copy quickstart snippets for your tools."}
            </p>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Card padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Router tunnel URL</p>
            <p className="mt-2 truncate font-mono text-sm text-text-main">{tunnel?.publicUrl || "Not ready"}</p>
            <p className="mt-1 text-xs text-text-muted">Use as router base URL for /api/v1/* requests.</p>
          </div>
          {isManager ? (
            <button
              type="button"
              onClick={refreshTunnelUrl}
              disabled={refreshingTunnel}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshingTunnel ? "Refreshing..." : "Refresh URL"}
            </button>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isManager ? (
          <>
            <QuickLink
              href="/dashboard/team"
              title="Team Member Management"
              desc="Invite Developers, inspect role/status, and manage access."
              icon="groups"
            />
            <QuickLink
              href="/dashboard/providers"
              title="Provider Connections"
              desc="Manage provider credentials, health checks, and connectivity."
              icon="dns"
            />
            <QuickLink
              href="/dashboard/models"
              title="Model Browser"
              desc="Review Team-available models and Combos exposed to Developers."
              icon="hub"
            />
            <QuickLink
              href="/dashboard/usage"
              title="Usage Analytics"
              desc="Analyze Team-level requests, spend, model distribution, and RTK savings."
              icon="bar_chart"
            />
            <QuickLink
              href="/dashboard/quota"
              title="RTK Pool"
              desc="Top up or reset RTK savings capacity for streaming optimization."
              icon="data_usage"
            />
            <QuickLink
              href="/dashboard/chatbot"
              title="Chatbot"
              desc="Configure and interact with an external AI chatbot."
              icon="smart_toy"
            />
          </>
        ) : (
          <>
            <QuickLink
              href="/dashboard/usage"
              title="My Usage"
              desc="See your requests, spend, token volume, and RTK savings."
              icon="bar_chart"
            />
            <QuickLink
              href="/dashboard/models"
              title="Available Models"
              desc="Browse models and Combos currently available to your Team."
              icon="hub"
            />
            <QuickLink
              href="/dashboard/endpoint"
              title="API Quickstart"
              desc="Copy base URL + headers and test /api/v1/* quickly."
              icon="rocket_launch"
            />
            <QuickLink
              href="/dashboard/cli-tools"
              title="CLI Config Snippets"
              desc="Copy snippets for Claude Code, Codex, OpenCode, and more."
              icon="terminal"
            />
            <QuickLink
              href="/dashboard/combos"
              title="Team Combos"
              desc="Review configured Combo fallback orders for model routing."
              icon="layers"
              badge="Read-only"
            />
          </>
        )}
      </div>
    </div>
  );
}
