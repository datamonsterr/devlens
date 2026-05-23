"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardSkeleton, Input, Badge, Button } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

const MODEL_URL_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:20128";

export default function ModelsPage() {
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
            m.id.toLowerCase().includes(search.toLowerCase())
        ),
      }))
      .filter((p) => p.models.length > 0);
  }, [data, search, providerFilter]);

  const uniqueProviders = useMemo(
    () => [...new Set((data?.providers || []).map((p) => p.id))],
    [data]
  );

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Model Browser</h1>
          <p className="text-sm text-text-muted mt-1">
            Browse available models, combos, and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={copied ? "primary" : "outline"}
            size="sm"
            icon={copied ? "check" : "content_copy"}
            onClick={() => copy(MODEL_URL_BASE)}
          >
            {copied ? "Copied!" : "Copy API URL"}
          </Button>
        </div>
      </div>

      {/* RTK Status */}
      {data?.rtkActive && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[20px]">bolt</span>
            <span className="text-sm text-purple-700 dark:text-purple-300">
              RTK compression is active — token savings enabled
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
          iconLeft="search"
        />
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Providers</option>
          {uniqueProviders.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Toggle: Models / Combos */}
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

      {!showCombos ? (
        /* Models by Provider */
        <div className="flex flex-col gap-4">
          {filteredProviders.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-text-muted">No models found</p>
              </div>
            </Card>
          ) : (
            filteredProviders.map((provider) => (
              <Card key={provider.id} padding="md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">dns</span>
                  </div>
                  <div>
                    <h3 className="font-semibold capitalize">{provider.name}</h3>
                    {provider.isCompatible && (
                      <span className="text-xs text-text-muted">Compatible</span>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {provider.status === "online" && (
                      <Badge variant="success" size="sm" dot>Online</Badge>
                    )}
                    {provider.status === "offline" && (
                      <Badge variant="error" size="sm" dot>Offline</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {provider.models.map((model) => {
                    const price = data?.pricing?.[model.id];
                    return (
                      <div
                        key={model.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <code className="font-mono text-sm">{model.name}</code>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-[11px] text-text-muted font-mono">
                              {model.id}
                            </span>
                            {model.capabilities?.map((cap) => (
                              <Badge key={cap} variant="default" size="sm">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {price && (
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xs font-mono text-text-muted">
                              in: ${((price.input || 0) / 1000000).toFixed(4)}
                            </p>
                            <p className="text-xs font-mono text-text-muted">
                              out: ${((price.output || 0) / 1000000).toFixed(4)}
                            </p>
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
        /* Combos */
        <div className="flex flex-col gap-3">
          {!data?.combos?.length ? (
            <Card>
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                  <span className="material-symbols-outlined text-[32px]">layers</span>
                </div>
                <h3 className="text-lg font-medium">No Combos</h3>
                <p className="text-sm text-text-muted mt-2">
                  Combos are created by your team manager
                </p>
              </div>
            </Card>
          ) : (
            data.combos.map((combo) => (
              <Card key={combo.id} padding="sm">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <code className="font-mono text-sm font-medium">{combo.name}</code>
                    {combo.kind && (
                      <Badge variant="default" size="sm" className="ml-2">{combo.kind}</Badge>
                    )}
                    {combo.models.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {combo.models.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            <code className="text-[11px] bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono">
                              {m}
                            </code>
                            {i < combo.models.length - 1 && (
                              <span className="text-text-muted text-[10px]">&rarr;</span>
                            )}
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
