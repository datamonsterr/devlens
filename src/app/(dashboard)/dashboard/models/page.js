"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardSkeleton, Input, Badge, Button } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { useRole } from "@/shared/hooks/useRole";

const MODEL_URL_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:20261";

export default function ModelsPage() {
  const { isManager } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [showCombos, setShowCombos] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  useEffect(() => {
    fetch("/api/models/browse")
      .then((res) => res.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredProviders = useMemo(() => {
    if (!data?.providers) return [];
    return data.providers
      .filter((p) => !providerFilter || p.id === providerFilter)
      .map((p) => ({
        ...p,
        models: p.models.filter(
          (m) =>
            !search ||
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.id.toLowerCase().includes(search.toLowerCase()),
        ),
      }))
      .filter((p) => p.models.length > 0);
  }, [data, search, providerFilter]);

  const uniqueProviders = useMemo(
    () => [...new Set((data?.providers || []).map((p) => p.id))],
    [data],
  );

  const modelCount = useMemo(
    () => filteredProviders.reduce((acc, p) => acc + p.models.length, 0),
    [filteredProviders],
  );

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Model Browser</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isManager
              ? "Team-available models, providers, combos, and pricing visibility"
              : "Available models and combos for your Team"}
          </p>
        </div>
        <Button
          variant={copied ? "primary" : "outline"}
          size="sm"
          icon={copied ? "check" : "content_copy"}
          onClick={() => copy(MODEL_URL_BASE)}
        >
          {copied ? "Copied API URL" : "Copy API URL"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Providers</p>
          <p className="mt-2 text-2xl font-semibold">{(data?.providers || []).length}</p>
          <p className="text-xs text-text-muted">Connected or available sources</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Visible Models</p>
          <p className="mt-2 text-2xl font-semibold">{modelCount}</p>
          <p className="text-xs text-text-muted">After current filters</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Team Combos</p>
          <p className="mt-2 text-2xl font-semibold">{data?.combos?.length || 0}</p>
          <p className="text-xs text-text-muted">Configured fallback routes</p>
        </Card>
      </div>

      {data?.rtkActive && (
        <div className="rounded-xl border border-sky-300/70 bg-sky-500/10 px-4 py-3 dark:border-sky-800/70 dark:bg-sky-950/40">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-sky-700 dark:text-sky-300">bolt</span>
            <span className="text-sm text-sky-800 dark:text-sky-200">
              RTK compression is active for this Team.
            </span>
          </div>
        </div>
      )}

      <Card padding="md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            placeholder="Search by model name or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
            icon="search"
          />
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">All Providers</option>
            {uniqueProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              variant={!showCombos ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowCombos(false)}
            >
              Models
            </Button>
            <Button
              variant={showCombos ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowCombos(true)}
            >
              Combos ({data?.combos?.length || 0})
            </Button>
          </div>
        </div>
      </Card>

      {!showCombos ? (
        <div className="flex flex-col gap-4">
          {filteredProviders.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-[32px] text-text-subtle">search_off</span>
                <p className="mt-2 text-sm text-text-muted">No models found for the current filters</p>
              </div>
            </Card>
          ) : (
            filteredProviders.map((provider) => (
              <Card key={provider.id} padding="md">
                <div className="mb-3 flex items-center gap-3 border-b border-border-subtle/70 pb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-200">
                    <span className="material-symbols-outlined text-[20px]">dns</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold capitalize">{provider.name}</h3>
                    {provider.isCompatible && (
                      <span className="text-xs text-text-muted">Compatible provider</span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {provider.status === "online" && <Badge variant="success" size="sm" dot>Online</Badge>}
                    {provider.status === "offline" && <Badge variant="error" size="sm" dot>Offline</Badge>}
                  </div>
                </div>

                <div className="space-y-2">
                  {provider.models.map((model) => {
                    const price = data?.pricing?.[model.id];
                    return (
                      <div
                        key={model.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle/70 bg-surface-2/30 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <code className="text-sm font-medium">{model.name}</code>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] text-text-muted">{model.id}</span>
                            {model.capabilities?.map((cap) => (
                              <Badge key={cap} variant="default" size="sm">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {price && (
                          <div className="ml-3 shrink-0 text-right">
                            <p className="text-xs font-mono text-text-muted">in: ${((price.input || 0) / 1000000).toFixed(4)}</p>
                            <p className="text-xs font-mono text-text-muted">out: ${((price.output || 0) / 1000000).toFixed(4)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {!data?.combos?.length ? (
            <Card>
              <div className="py-12 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-200">
                  <span className="material-symbols-outlined text-[32px]">layers</span>
                </div>
                <h3 className="text-lg font-medium">No Combos</h3>
                <p className="mt-2 text-sm text-text-muted">Combos are configured by your Team manager.</p>
              </div>
            </Card>
          ) : (
            data.combos.map((combo) => (
              <Card key={combo.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-200">
                    <span className="material-symbols-outlined text-[18px]">layers</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium">{combo.name}</code>
                      {combo.kind && (
                        <Badge variant="default" size="sm">
                          {combo.kind}
                        </Badge>
                      )}
                    </div>
                    {combo.models.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {combo.models.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/5">{m}</code>
                            {i < combo.models.length - 1 && <span className="text-[10px] text-text-muted">-&gt;</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
