"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardSkeleton, Button, Input, Badge } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import RoleGuard from "@/shared/components/RoleGuard";

export default function PricingPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <PricingContent />
    </RoleGuard>
  );
}

function PricingContent() {
  const { isManager } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const startEdit = (provider, model, pricing) => {
    setEditing(`${provider}::${model}`);
    setEditValues({
      input: pricing.input ?? "",
      output: pricing.output ?? "",
      cached: pricing.cached ?? "",
      reasoning: pricing.reasoning ?? "",
      cache_creation: pricing.cache_creation ?? "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValues({});
  };

  const handleSave = async (provider, model) => {
    const values = {};
    for (const [key, val] of Object.entries(editValues)) {
      const n = parseFloat(val);
      if (!isNaN(n) && n >= 0) values[key] = n;
    }
    if (Object.keys(values).length === 0) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [provider]: { [model]: values } }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`Updated ${provider}/${model}`);
      setEditing(null);
      fetchPricing();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async (provider, model) => {
    setError(null);
    setSuccess(null);
    try {
      const url = `/api/pricing?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`;
      const res = await fetch(url, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`Reset ${provider}/${model} to default`);
      fetchPricing();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetAll = async () => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/pricing", { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess("All pricing reset to defaults");
      fetchPricing();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isManager) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <Card>
          <div className="p-6 text-center">
            <p className="text-text-muted">Only managers can manage pricing.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <Card>
          <div className="p-6 text-center text-red-500">{error}</div>
        </Card>
      </div>
    );
  }

  const providers = data ? Object.keys(data) : [];

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Pricing Management</h2>
          <p className="text-sm text-text-muted">Override per-model token pricing. Values in $/M tokens.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPricing} icon="refresh">
            Refresh
          </Button>
          <Button variant="outline" onClick={handleResetAll} icon="restart_alt">
            Reset All
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {providers.length === 0 && (
        <Card>
          <div className="p-6 text-center text-text-muted">No pricing data available.</div>
        </Card>
      )}

      {providers.map((provider) => {
        const models = data[provider] || {};
        const modelKeys = Object.keys(models);

        return (
          <Card key={provider}>
            <div className="px-6 py-4 border-b border-border-subtle">
              <h3 className="text-sm font-semibold text-text-main uppercase tracking-wider">{provider}</h3>
              <p className="text-xs text-text-muted">{modelKeys.length} models</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="px-6 py-2 text-left font-medium">Model</th>
                    <th className="px-3 py-2 text-right font-medium">Input</th>
                    <th className="px-3 py-2 text-right font-medium">Output</th>
                    <th className="px-3 py-2 text-right font-medium">Cached</th>
                    <th className="px-3 py-2 text-right font-medium">Reasoning</th>
                    <th className="px-3 py-2 text-right font-medium">Cache Create</th>
                    <th className="px-4 py-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modelKeys.map((model) => {
                    const pricing = models[model];
                    const editKey = `${provider}::${model}`;
                    const isEditing = editing === editKey;

                    return (
                      <tr key={model} className="border-b border-border-subtle last:border-0 hover:bg-surface-2">
                        <td className="px-6 py-2 font-mono text-xs text-text-main">{model}</td>
                        {["input", "output", "cached", "reasoning", "cache_creation"].map((field) => (
                          <td key={field} className="px-3 py-2 text-right font-mono text-xs">
                            {isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValues[field] ?? ""}
                                onChange={(e) =>
                                  setEditValues((prev) => ({ ...prev, [field]: e.target.value }))
                                }
                                className="w-20 text-right"
                              />
                            ) : (
                              <span className="text-text-main">
                                {pricing[field] != null ? `$${Number(pricing[field]).toFixed(2)}` : "-"}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSave(provider, model)}
                                >
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(provider, model, pricing)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReset(provider, model)}
                                >
                                  Reset
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
