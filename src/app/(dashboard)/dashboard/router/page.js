"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardSkeleton, Button, Input, Badge, Modal, Toggle } from "@/shared/components";
import { ConfirmModal } from "@/shared/components/Modal";
import { useRole } from "@/shared/hooks/useRole";
import RoleGuard from "@/shared/components/RoleGuard";
import ComboFormModal from "@/shared/components/ComboFormModal";

const TABS = [
  { id: "providers", label: "Provider Connections", icon: "lan" },
  { id: "combos", label: "Combos", icon: "account_tree" },
  { id: "aliases", label: "Model Aliases", icon: "label" },
  { id: "pricing", label: "Pricing Overrides", icon: "price_change" },
  { id: "rtk", label: "RTK Pool", icon: "savings" },
  { id: "availability", label: "Model Availability", icon: "toggle_on" },
  { id: "settings", label: "Router Settings", icon: "tune" },
  { id: "audit", label: "Audit Log", icon: "history" },
];

function formatTokens(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RouterConfigPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <RouterConfigContent />
    </RoleGuard>
  );
}

function RouterConfigContent() {
  const [activeTab, setActiveTab] = useState("providers");

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold">Router Config</h1>
        <p className="text-sm text-text-muted mt-1">
          Configure providers, combos, aliases, pricing, RTK pool, and routing behavior
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-surface-2/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
              activeTab === tab.id
                ? "bg-surface shadow-sm text-text-main"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "providers" && <ProvidersTab />}
      {activeTab === "combos" && <CombosTab />}
      {activeTab === "aliases" && <AliasesTab />}
      {activeTab === "pricing" && <PricingTab />}
      {activeTab === "rtk" && <RtkTab />}
      {activeTab === "availability" && <ModelAvailabilityTab />}
      {activeTab === "settings" && <RouterSettingsTab />}
      {activeTab === "audit" && <AuditTab />}
    </div>
  );
}

// ─── Providers Tab ────────────────────────────────────────────────────────────

function ProvidersTab() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [editingConn, setEditingConn] = useState(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleToggle = async (conn) => {
    try {
      await fetch(`/api/providers/${conn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !conn.isActive }),
      });
      await fetchConnections();
    } catch {}
  };

  const handleDelete = (conn) => {
    setConfirmState({
      title: "Delete Provider Connection",
      message: `Delete "${conn.name || conn.provider}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmState(null);
        await fetch(`/api/providers/${conn.id}`, { method: "DELETE" });
        await fetchConnections();
      },
    });
  };

  const handleTest = async (conn) => {
    setTestingId(conn.id);
    try {
      const res = await fetch("/api/providers/test-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "single", providerId: conn.id }),
      });
      const data = res.ok ? await res.json() : null;
      setTestResults((prev) => ({ ...prev, [conn.id]: data?.results?.[0] || { status: "error" } }));
    } catch {
      setTestResults((prev) => ({ ...prev, [conn.id]: { status: "error" } }));
    } finally {
      setTestingId(null);
    }
  };

  const handlePriorityChange = async (conn, delta) => {
    const newPriority = Math.max(1, (conn.priority || 1) + delta);
    await fetch(`/api/providers/${conn.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: newPriority }),
    });
    await fetchConnections();
  };

  const handleCooldownChange = async (conn, seconds) => {
    await fetch(`/api/providers/${conn.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cooldown: seconds }),
    });
    await fetchConnections();
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{connections.length} connection{connections.length !== 1 ? "s" : ""}</p>
        <Button size="sm" icon="add" onClick={() => window.location.assign("/dashboard/providers/new")}>
          Add Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">lan</span>
            <p className="mt-2 font-medium">No provider connections</p>
            <p className="text-sm text-text-muted">Add a provider to start routing.</p>
          </div>
        </Card>
      ) : (
        connections.map((conn) => (
          <ProviderConnectionCard
            key={conn.id}
            conn={conn}
            testResult={testResults[conn.id]}
            testing={testingId === conn.id}
            onToggle={() => handleToggle(conn)}
            onDelete={() => handleDelete(conn)}
            onTest={() => handleTest(conn)}
            onPriorityUp={() => handlePriorityChange(conn, -1)}
            onPriorityDown={() => handlePriorityChange(conn, 1)}
            onCooldownChange={(s) => handleCooldownChange(conn, s)}
          />
        ))
      )}

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}

function ProviderConnectionCard({ conn, testResult, testing, onToggle, onDelete, onTest, onPriorityUp, onPriorityDown, onCooldownChange }) {
  const [editingCooldown, setEditingCooldown] = useState(false);
  const [cooldownDraft, setCooldownDraft] = useState(String(conn.cooldown || 0));

  const statusColor = conn.isActive ? "text-emerald-500" : "text-text-muted";
  const testStatus = testResult?.status || conn.testStatus;

  return (
    <Card padding="sm" className="group">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <span className="material-symbols-outlined text-[18px] text-primary">lan</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{conn.name || conn.provider}</p>
            <p className="text-[11px] text-text-muted">{conn.provider} · {conn.authType}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={`flex items-center gap-1 text-[11px] font-medium ${statusColor}`}>
                <span className="material-symbols-outlined text-[12px]">
                  {conn.isActive ? "check_circle" : "cancel"}
                </span>
                {conn.isActive ? "Active" : "Disabled"}
              </span>

              <span className="text-[11px] text-text-muted">Priority: {conn.priority ?? "—"}</span>

              {editingCooldown ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    value={cooldownDraft}
                    onChange={(e) => setCooldownDraft(e.target.value)}
                    onBlur={() => {
                      setEditingCooldown(false);
                      const s = parseInt(cooldownDraft, 10);
                      if (!isNaN(s) && s >= 0) onCooldownChange(s);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                      if (e.key === "Escape") { setEditingCooldown(false); setCooldownDraft(String(conn.cooldown || 0)); }
                    }}
                    className="w-16 rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs outline-none dark:bg-black/20"
                  />
                  <span className="text-[11px] text-text-muted">s</span>
                </div>
              ) : (
                <button
                  onClick={() => setEditingCooldown(true)}
                  className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-text-muted hover:bg-black/5 hover:text-text-main dark:hover:bg-white/5"
                  title="Edit cooldown"
                >
                  Cooldown: {conn.cooldown || 0}s
                  <span className="material-symbols-outlined text-[11px]">edit</span>
                </button>
              )}

              {conn.lastTestedAt && (
                <span className="text-[11px] text-text-muted">Tested: {timeAgo(conn.lastTestedAt)}</span>
              )}

              {testStatus && testStatus !== "unknown" && (
                <Badge variant={testStatus === "success" ? "success" : "error"} size="sm">
                  {testStatus}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button onClick={onPriorityUp} className="p-1 rounded text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5" title="Higher priority">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </button>
            <button onClick={onPriorityDown} className="p-1 rounded text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5" title="Lower priority">
              <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            </button>
          </div>

          <Toggle size="sm" checked={conn.isActive} onChange={onToggle} />

          <button
            onClick={onTest}
            disabled={testing}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[12px] text-text-muted hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[14px]">{testing ? "hourglass_empty" : "play_circle"}</span>
            {testing ? "Testing…" : "Test"}
          </button>

          <button
            onClick={onDelete}
            className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Combos Tab ───────────────────────────────────────────────────────────────

function CombosTab() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [combosRes, providersRes] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/providers"),
      ]);
      if (combosRes.ok) { const d = await combosRes.json(); setCombos((d.combos || []).filter((c) => !c.kind)); }
      if (providersRes.ok) { const d = await providersRes.json(); setActiveProviders(d.connections || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data) => {
    const res = await fetch("/api/combos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { await fetchData(); setShowCreate(false); }
    else { const err = await res.json(); alert(err.error || "Failed to create combo"); }
  };

  const handleUpdate = async (id, data) => {
    const res = await fetch(`/api/combos/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (res.ok) { await fetchData(); setEditingCombo(null); }
    else { const err = await res.json(); alert(err.error || "Failed to update combo"); }
  };

  const handleDelete = (combo) => {
    setConfirmState({
      title: "Delete Combo",
      message: `Delete combo "${combo.name}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        await fetch(`/api/combos/${combo.id}`, { method: "DELETE" });
        await fetchData();
      },
    });
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{combos.length} combo{combos.length !== 1 ? "s" : ""}</p>
        <Button size="sm" icon="add" onClick={() => setShowCreate(true)}>Create Combo</Button>
      </div>

      {combos.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">account_tree</span>
            <p className="mt-2 font-medium">No combos yet</p>
            <p className="text-sm text-text-muted">Create model fallback sequences</p>
          </div>
        </Card>
      ) : (
        combos.map((combo) => (
          <Card key={combo.id} padding="sm">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <code className="block truncate font-mono text-sm font-medium">{combo.name}</code>
                <div className="mt-1 flex flex-wrap gap-1">
                  {combo.models.length === 0 ? (
                    <span className="text-xs text-text-muted italic">No models</span>
                  ) : (
                    combo.models.slice(0, 4).map((m, i) => (
                      <code key={i} className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-text-muted dark:bg-white/5">{m}</code>
                    ))
                  )}
                  {combo.models.length > 4 && <span className="text-[10px] text-text-muted">+{combo.models.length - 4} more</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setEditingCombo(combo)} className="rounded p-1.5 text-text-muted hover:bg-black/5 hover:text-primary dark:hover:bg-white/5" title="Edit">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => handleDelete(combo)} className="rounded p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500" title="Delete">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </Card>
        ))
      )}

      <ComboFormModal key="create" isOpen={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} activeProviders={activeProviders} />
      <ComboFormModal key={editingCombo?.id || "edit"} isOpen={!!editingCombo} combo={editingCombo} onClose={() => setEditingCombo(null)} onSave={(d) => handleUpdate(editingCombo.id, d)} activeProviders={activeProviders} />
      <ConfirmModal isOpen={!!confirmState} onClose={() => setConfirmState(null)} onConfirm={confirmState?.onConfirm} title={confirmState?.title} message={confirmState?.message} variant="danger" />
    </div>
  );
}

// ─── Aliases Tab ──────────────────────────────────────────────────────────────

function AliasesTab() {
  const [aliases, setAliases] = useState({});
  const [loading, setLoading] = useState(true);
  const [newAlias, setNewAlias] = useState("");
  const [newModel, setNewModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const fetchAliases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/models/alias");
      if (res.ok) { const d = await res.json(); setAliases(d.aliases || {}); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAliases(); }, [fetchAliases]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAlias.trim() || !newModel.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/models/alias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alias: newAlias.trim(), model: newModel.trim() }),
      });
      if (res.ok) { setNewAlias(""); setNewModel(""); await fetchAliases(); }
      else { const d = await res.json(); setError(d.error || "Failed to create alias"); }
    } finally { setSaving(false); }
  };

  const handleDelete = (alias) => {
    setConfirmState({
      title: "Delete Alias",
      message: `Delete alias "${alias}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        await fetch(`/api/models/alias?alias=${encodeURIComponent(alias)}`, { method: "DELETE" });
        await fetchAliases();
      },
    });
  };

  if (loading) return <CardSkeleton />;

  const entries = Object.entries(aliases);

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md">
        <h3 className="mb-3 font-semibold">Add Model Alias</h3>
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Alias (e.g. fast)" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} className="flex-1" />
          <Input placeholder="Model string (e.g. gpt-4o-mini)" value={newModel} onChange={(e) => setNewModel(e.target.value)} className="flex-1" />
          <Button type="submit" loading={saving} disabled={!newAlias.trim() || !newModel.trim()}>Add</Button>
        </form>
        <p className="mt-1 text-[11px] text-text-muted">Developers can use the alias name in API requests instead of the full model string.</p>
      </Card>

      {entries.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">label</span>
            <p className="mt-2 font-medium">No aliases defined</p>
          </div>
        </Card>
      ) : (
        <Card padding="sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-text-muted">
                <th className="pb-2 pl-2 font-medium">Alias</th>
                <th className="pb-2 font-medium">Model</th>
                <th className="pb-2 pr-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([alias, model]) => (
                <tr key={alias} className="border-b border-border-subtle/50 last:border-0">
                  <td className="py-2 pl-2"><code className="font-mono text-xs font-medium">{alias}</code></td>
                  <td className="py-2"><code className="font-mono text-xs text-text-muted">{model}</code></td>
                  <td className="py-2 pr-2 text-right">
                    <button onClick={() => handleDelete(alias)} className="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-red-500">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmModal isOpen={!!confirmState} onClose={() => setConfirmState(null)} onConfirm={confirmState?.onConfirm} title={confirmState?.title} message={confirmState?.message} variant="danger" />
    </div>
  );
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

function PricingTab() {
  const [pricing, setPricing] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pricing");
      if (res.ok) { const d = await res.json(); setPricing(d); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  const handleEdit = (provider, model, data) => {
    setEditingKey(`${provider}/${model}`);
    setDraft({ provider, model, input: data.input ?? "", output: data.output ?? "" });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { [draft.provider]: { [draft.model]: { input: parseFloat(draft.input), output: parseFloat(draft.output) } } };
      const res = await fetch("/api/pricing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { setEditingKey(null); await fetchPricing(); }
    } finally { setSaving(false); }
  };

  const handleReset = (provider, model) => {
    setConfirmState({
      title: "Reset Pricing",
      message: `Reset pricing for ${provider}/${model} to default?`,
      onConfirm: async () => {
        setConfirmState(null);
        await fetch(`/api/pricing?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`, { method: "DELETE" });
        await fetchPricing();
      },
    });
  };

  if (loading) return <CardSkeleton />;

  const allEntries = Object.entries(pricing).flatMap(([provider, models]) =>
    Object.entries(models).map(([model, data]) => ({ provider, model, data }))
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">{allEntries.length} pricing entries (auto + manual overrides)</p>

      {allEntries.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">price_change</span>
            <p className="mt-2 font-medium">No pricing data</p>
          </div>
        </Card>
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 pl-2 font-medium">Provider / Model</th>
                  <th className="pb-2 font-medium text-right">Input ($/M tok)</th>
                  <th className="pb-2 font-medium text-right">Output ($/M tok)</th>
                  <th className="pb-2 pr-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {allEntries.map(({ provider, model, data }) => {
                  const key = `${provider}/${model}`;
                  const isEditing = editingKey === key;
                  return (
                    <tr key={key} className="border-b border-border-subtle/50 last:border-0">
                      <td className="py-1.5 pl-2">
                        <p className="font-medium text-xs">{provider}</p>
                        <code className="font-mono text-[11px] text-text-muted">{model}</code>
                      </td>
                      {isEditing ? (
                        <>
                          <td className="py-1.5 text-right">
                            <input type="number" step="0.01" value={draft.input} onChange={(e) => setDraft({ ...draft, input: e.target.value })}
                              className="w-20 rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs outline-none dark:bg-black/20" />
                          </td>
                          <td className="py-1.5 text-right">
                            <input type="number" step="0.01" value={draft.output} onChange={(e) => setDraft({ ...draft, output: e.target.value })}
                              className="w-20 rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs outline-none dark:bg-black/20" />
                          </td>
                          <td className="py-1.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={handleSave} disabled={saving} className="rounded bg-primary px-2 py-0.5 text-[11px] text-white hover:opacity-90 disabled:opacity-50">Save</button>
                              <button onClick={() => setEditingKey(null)} className="rounded px-2 py-0.5 text-[11px] text-text-muted hover:bg-black/5 dark:hover:bg-white/5">Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 text-right font-mono text-xs text-text-muted">{data.input ?? "—"}</td>
                          <td className="py-1.5 text-right font-mono text-xs text-text-muted">{data.output ?? "—"}</td>
                          <td className="py-1.5 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleEdit(provider, model, data)} className="rounded p-1 text-text-muted hover:bg-black/5 hover:text-primary dark:hover:bg-white/5">
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>
                              <button onClick={() => handleReset(provider, model)} className="rounded p-1 text-text-muted hover:bg-red-500/10 hover:text-red-500">
                                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmModal isOpen={!!confirmState} onClose={() => setConfirmState(null)} onConfirm={confirmState?.onConfirm} title={confirmState?.title} message={confirmState?.message} variant="danger" />
    </div>
  );
}

// ─── RTK Pool Tab ─────────────────────────────────────────────────────────────

function RtkTab() {
  const [pool, setPool] = useState(null);
  const [history, setHistory] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchPool = useCallback(async () => {
    const res = await fetch("/api/team/rtk-pool");
    if (res.ok) { const d = await res.json(); setPool(d); }
  }, []);

  const fetchHistory = useCallback(async () => {
    const res = await fetch("/api/team/rtk-pool/history");
    if (res.ok) { const d = await res.json(); setHistory(d.history || []); }
  }, []);

  useEffect(() => { fetchPool(); fetchHistory(); }, [fetchPool, fetchHistory]);

  const submit = async (mode) => {
    const amount = parseInt(topUpAmount, 10);
    if (isNaN(amount) || amount < 0) { setError("Enter a valid amount"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/team/rtk-pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, mode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setPool(d);
      setTopUpAmount("");
      setSuccess(mode === "reset" ? `RTK pool reset to ${formatTokens(amount)}` : `Added ${formatTokens(amount)} tokens`);
      fetchHistory();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error} <button onClick={() => setError(null)} className="ml-2 font-semibold hover:underline">Dismiss</button></div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">{success} <button onClick={() => setSuccess(null)} className="ml-2 font-semibold hover:underline">Dismiss</button></div>}

      <Card padding="md" className="text-center">
        <p className="text-xs text-text-muted uppercase tracking-wide">Current RTK Pool</p>
        <p className={`mt-2 text-4xl font-bold ${pool?.active ? "text-purple-600" : "text-text-muted"}`}>
          {pool ? formatTokens(pool.rtkPool) : "…"}
        </p>
        <p className="text-sm text-text-muted mt-1">tokens remaining</p>
        <div className="mt-2">
          {pool?.active ? <Badge variant="success">Active</Badge> : <Badge variant="error">Inactive</Badge>}
        </div>
      </Card>

      <Card padding="md">
        <h3 className="mb-3 font-semibold">Manage Pool</h3>
        <div className="flex gap-2">
          <Input type="number" placeholder="Token amount" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} min="1" className="flex-1" />
          <Button loading={saving} disabled={!topUpAmount} onClick={() => submit("topup")}>Top Up</Button>
          <Button variant="outline" loading={saving} disabled={!topUpAmount} onClick={() => submit("reset")}>Reset</Button>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">Top Up adds to the pool; Reset overwrites the pool to the entered amount.</p>
      </Card>

      <Card padding="md">
        <h3 className="mb-3 font-semibold">Pool History</h3>
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Remaining</th>
                  <th className="pb-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-2">
                      <Badge variant={h.action === "allocate" ? "success" : h.action === "reset" ? "warning" : "default"} size="sm">{h.action}</Badge>
                    </td>
                    <td className="py-2 text-right font-mono text-xs">{h.action === "consume" ? "-" : "+"}{formatTokens(h.amount)}</td>
                    <td className="py-2 text-right font-mono text-xs">{formatTokens(h.remainingAfter)}</td>
                    <td className="py-2 text-right text-xs text-text-muted">{new Date(h.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Router Settings Tab ──────────────────────────────────────────────────────

const FALLBACK_OPTIONS = [
  { value: "next_on_error", label: "Next on any error", desc: "Try the next provider/model on any error response" },
  { value: "next_on_429", label: "Next on rate limit only", desc: "Only fall back when receiving 429 Too Many Requests" },
  { value: "always_try_all", label: "Always try all", desc: "Always attempt every model in the combo sequence" },
];

const COMBO_STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback", desc: "Try models in order, use first that succeeds" },
  { value: "round_robin", label: "Round Robin", desc: "Distribute requests evenly across models" },
  { value: "sticky_round_robin", label: "Sticky Round Robin", desc: "Round robin with sticky session affinity" },
];

function RouterSettingsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/router/settings");
      if (res.ok) { const d = await res.json(); setSettings(d.settings); setDraft(d.settings); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/router/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) { const d = await res.json(); setSettings(d.settings); setSuccess(true); setTimeout(() => setSuccess(false), 2500); }
    } finally { setSaving(false); }
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          Settings saved
        </div>
      )}

      <Card padding="md">
        <h3 className="mb-4 font-semibold">Fallback Behavior</h3>
        <div className="flex flex-col gap-2">
          {FALLBACK_OPTIONS.map((opt) => (
            <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${draft.fallbackBehavior === opt.value ? "border-primary/40 bg-primary/5" : "border-border hover:border-border-subtle"}`}>
              <input type="radio" name="fallbackBehavior" value={opt.value} checked={draft.fallbackBehavior === opt.value} onChange={() => setDraft({ ...draft, fallbackBehavior: opt.value })} className="mt-0.5 accent-primary" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card padding="md">
        <h3 className="mb-4 font-semibold">Default Combo Strategy</h3>
        <div className="flex flex-col gap-2">
          {COMBO_STRATEGY_OPTIONS.map((opt) => (
            <label key={opt.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${draft.comboStrategy === opt.value ? "border-primary/40 bg-primary/5" : "border-border hover:border-border-subtle"}`}>
              <input type="radio" name="comboStrategy" value={opt.value} checked={draft.comboStrategy === opt.value} onChange={() => setDraft({ ...draft, comboStrategy: opt.value })} className="mt-0.5 accent-primary" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card padding="md">
        <h3 className="mb-3 font-semibold">Default Provider Cooldown</h3>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min="0"
            value={draft.cooldownSeconds ?? 60}
            onChange={(e) => setDraft({ ...draft, cooldownSeconds: parseInt(e.target.value, 10) || 0 })}
            className="w-32"
          />
          <span className="text-sm text-text-muted">seconds</span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">How long to wait before retrying a provider after a failure. Individual connections can override this.</p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>Save Router Settings</Button>
      </div>
    </div>
  );
}

// ─── Model Availability Tab ───────────────────────────────────────────────────

function ModelAvailabilityTab() {
  const [disabled, setDisabled] = useState({});
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProvider, setNewProvider] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [disRes, avRes] = await Promise.all([
        fetch("/api/models/disabled"),
        fetch("/api/models/availability"),
      ]);
      if (disRes.ok) { const d = await disRes.json(); setDisabled(d.disabled || {}); }
      if (avRes.ok) { const d = await avRes.json(); setAvailability(d.models || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!newProvider.trim() || !newModelId.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/models/disabled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAlias: newProvider.trim(), ids: [newModelId.trim()] }),
      });
      setNewProvider(""); setNewModelId("");
      await fetchData();
    } finally { setSaving(false); }
  };

  const handleEnable = (providerAlias, modelId) => {
    setConfirmState({
      title: "Re-enable Model",
      message: `Re-enable model "${modelId}" for provider "${providerAlias}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        await fetch(`/api/models/disabled?providerAlias=${encodeURIComponent(providerAlias)}&id=${encodeURIComponent(modelId)}`, { method: "DELETE" });
        await fetchData();
      },
    });
  };

  const handleClearCooldown = async (provider, model) => {
    await fetch("/api/models/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clearCooldown", provider, model }),
    });
    await fetchData();
  };

  if (loading) return <CardSkeleton />;

  const disabledEntries = Object.entries(disabled).flatMap(([provider, ids]) =>
    (ids || []).map((id) => ({ provider, id }))
  );

  return (
    <div className="flex flex-col gap-4">
      <Card padding="md">
        <h3 className="mb-3 font-semibold">Disable Model for Provider</h3>
        <form onSubmit={handleDisable} className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Provider alias (e.g. openai)" value={newProvider} onChange={(e) => setNewProvider(e.target.value)} className="flex-1" />
          <Input placeholder="Model ID (e.g. gpt-4o)" value={newModelId} onChange={(e) => setNewModelId(e.target.value)} className="flex-1" />
          <Button type="submit" loading={saving} disabled={!newProvider.trim() || !newModelId.trim()}>Disable</Button>
        </form>
        <p className="mt-1 text-[11px] text-text-muted">Disabled models are excluded from routing for this team.</p>
      </Card>

      {disabledEntries.length > 0 && (
        <Card padding="sm">
          <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">Disabled Models ({disabledEntries.length})</p>
          <div className="flex flex-col gap-1">
            {disabledEntries.map(({ provider, id }) => (
              <div key={`${provider}/${id}`} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 dark:border-red-900/30 dark:bg-red-950/20">
                <div>
                  <code className="font-mono text-xs font-medium">{id}</code>
                  <span className="ml-2 text-[11px] text-text-muted">{provider}</span>
                </div>
                <button onClick={() => handleEnable(provider, id)} className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                  Re-enable
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {availability.length > 0 && (
        <Card padding="sm">
          <p className="mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400">Cooldowns / Unavailable ({availability.length})</p>
          <div className="flex flex-col gap-1">
            {availability.map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div>
                  <code className="font-mono text-xs font-medium">{item.model}</code>
                  <span className="ml-2 text-[11px] text-text-muted">{item.provider}</span>
                  <Badge variant="warning" size="sm" className="ml-2">{item.status}</Badge>
                  {item.until && <span className="ml-2 text-[11px] text-text-muted">until {new Date(item.until).toLocaleTimeString()}</span>}
                  {item.lastError && <p className="mt-0.5 text-[10px] text-red-500 truncate max-w-xs">{item.lastError}</p>}
                </div>
                <button onClick={() => handleClearCooldown(item.provider, item.model)} className="rounded px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10">
                  Clear Cooldown
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {disabledEntries.length === 0 && availability.length === 0 && (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">toggle_on</span>
            <p className="mt-2 font-medium">All models available</p>
            <p className="text-sm text-text-muted">No models are disabled or on cooldown</p>
          </div>
        </Card>
      )}

      <ConfirmModal isOpen={!!confirmState} onClose={() => setConfirmState(null)} onConfirm={confirmState?.onConfirm} title={confirmState?.title} message={confirmState?.message} variant="primary" />
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const RESOURCE_LABELS = {
  providerConnection: "Provider Connection",
  combo: "Combo",
  modelAlias: "Model Alias",
  pricingOverride: "Pricing Override",
  rtkPool: "RTK Pool",
  routerSettings: "Router Settings",
};

const ACTION_VARIANTS = {
  create: "success",
  update: "default",
  delete: "error",
  reset: "warning",
  set: "default",
  topup: "success",
};

function AuditTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState("");

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (resource) params.set("resource", resource);
      const res = await fetch(`/api/router/audit?${params}`);
      if (res.ok) { const d = await res.json(); setEntries(d.entries || []); }
    } finally { setLoading(false); }
  }, [resource]);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-main"
        >
          <option value="">All resources</option>
          {Object.entries(RESOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={fetchAudit} icon="refresh">Refresh</Button>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : entries.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-text-muted">history</span>
            <p className="mt-2 font-medium">No audit entries</p>
            <p className="text-sm text-text-muted">Config changes will appear here</p>
          </div>
        </Card>
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-text-muted">
                  <th className="pb-2 pl-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Actor</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Resource</th>
                  <th className="pb-2 pr-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-2 pl-2 text-xs text-text-muted whitespace-nowrap">{timeAgo(e.createdAt)}</td>
                    <td className="py-2 text-xs">
                      <span className="font-mono text-[11px]">{e.actorId?.slice(0, 12)}…</span>
                      <Badge variant="default" size="sm" className="ml-1">{e.actorRole}</Badge>
                    </td>
                    <td className="py-2">
                      <Badge variant={ACTION_VARIANTS[e.action] || "default"} size="sm">{e.action}</Badge>
                    </td>
                    <td className="py-2 text-xs">{RESOURCE_LABELS[e.resource] || e.resource}{e.resourceId ? <span className="ml-1 text-text-muted">#{e.resourceId.slice(0, 8)}</span> : null}</td>
                    <td className="py-2 pr-2 text-xs text-text-muted">
                      {e.payload ? (
                        <code className="font-mono text-[10px]">{JSON.stringify(e.payload).slice(0, 60)}</code>
                      ) : "—"}
                    </td>
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
