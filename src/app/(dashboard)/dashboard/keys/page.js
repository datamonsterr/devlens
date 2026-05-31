"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Input, Modal, Badge, ConfirmModal, CardSkeleton } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function KeysPage() {
  const { isManager, isDeveloper } = useRole();
  const [keys, setKeys] = useState([]);
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isManager) {
      setRedirecting(true);
      window.location.replace("/dashboard/team");
    }
  }, [isManager]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const { copied, copy } = useCopyToClipboard(3000);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  useEffect(() => {
    setApiBaseUrl(`${window.location.origin}/v1`);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setNewKey(data);
      setShowCreateModal(false);
      setShowNewKeyModal(true);
      setKeyName("");
      fetchKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to revoke key");
      }
      setConfirmState(null);
      fetchKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRotate = async (id) => {
    try {
      const res = await fetch(`/api/keys/${id}/rotate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rotate key");
      setNewKey(data);
      setShowNewKeyModal(true);
      fetchKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeKeyCount = keys.filter((k) => k.isActive).length;

  if (loading || redirecting) {
    if (redirecting) {
      return (
        <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-surface-2 rounded" />
            <div className="h-24 bg-surface-2 rounded-xl" />
          </div>
          <p className="text-sm text-text-muted">Redirecting to Team management...</p>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isManager
              ? "Team-wide API Key metadata and operational controls"
              : "Create and manage your own API Keys for /api/v1/* access"}
          </p>
        </div>
        {isDeveloper && (
          <Button
            icon="add"
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto"
          >
            Create Key
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Visible Keys</p>
          <p className="mt-2 text-2xl font-semibold">{keys.length}</p>
          <p className="text-xs text-text-muted">Scoped to current Team context</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{activeKeyCount}</p>
          <p className="text-xs text-text-muted">Currently valid keys</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Revoked</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300">{Math.max(keys.length - activeKeyCount, 0)}</p>
          <p className="text-xs text-text-muted">Inactive historical records</p>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {isDeveloper && (
        <Card>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-medium">API access</h2>
              <p className="text-sm text-text-muted mt-1">Use this base URL with your API Key for /api/v1/* requests.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">API Base URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 block px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 font-mono text-sm break-all">
                  {apiBaseUrl}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copied === "api-base-url" ? "check" : "content_copy"}
                  onClick={() => copy(apiBaseUrl, "api-base-url")}
                >
                  {copied === "api-base-url" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-text-muted">Full API Key plaintext appears only when created or rotated. If unavailable, create or rotate a key.</p>
          </div>
        </Card>
      )}

      {keys.length === 0 ? (
        <Card padding="lg">
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/12 text-brand-700 dark:text-brand-300">
              <span className="material-symbols-outlined text-[32px]">key</span>
            </div>
            <h3 className="text-lg font-medium">No API Keys</h3>
            <p className="mt-2 text-sm text-text-muted">
              {isDeveloper
                ? "Create your first API Key to start calling /api/v1/* endpoints."
                : "No Developer API Keys have been created yet."}
            </p>
            {isDeveloper && (
              <Button
                icon="add"
                onClick={() => {
                  setError(null);
                  setShowCreateModal(true);
                }}
                className="mt-4"
              >
                Create Your First Key
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-2/70 text-left text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  {isManager && <th className="px-4 py-3 font-medium">Developer</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-t border-border-subtle/80">
                    <td className="px-4 py-3">
                      <div className="min-w-[190px]">
                        <code className="block truncate font-mono text-xs text-text-main">{key.name}</code>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-text-subtle">{key.id}</p>
                      </div>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3">
                        {key.userId ? (
                          <code className="font-mono text-[11px] text-text-muted">{key.userId.slice(0, 12)}...</code>
                        ) : (
                          <span className="text-text-subtle">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {key.isActive ? (
                        <Badge variant="success" size="sm" dot>Active</Badge>
                      ) : (
                        <Badge variant="error" size="sm" dot>Revoked</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatDate(key.createdAt)}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{formatDate(key.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {key.isActive && (
                          <>
                            <button
                              onClick={() => handleRotate(key.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
                              title="Rotate key"
                            >
                              <span className="material-symbols-outlined text-[15px]">autorenew</span>
                              Rotate
                            </button>
                            <button
                              onClick={() => setConfirmState({ id: key.id, name: key.name })}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-300/70 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10"
                              title="Revoke key"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create API Key">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Key Name</label>
            <Input
              placeholder="e.g. Production CLI Key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              autoFocus
            />
            <p className="mt-1 text-xs text-text-muted">
              Give your key a descriptive name to identify its purpose.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!keyName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewKeyModal} onClose={() => setShowNewKeyModal(false)} title="API Key Created">
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-amber-600">warning</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Copy this key now - you will not see it again.
                </p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  For security, the full key is only shown once. Store it safely.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Key Name</label>
            <code className="block text-sm font-mono">{newKey?.name}</code>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">API Key</label>
            <div className="flex items-center gap-2">
              <code className="block flex-1 break-all rounded-lg bg-black/5 px-3 py-2 font-mono text-sm dark:bg-white/5">
                {newKey?.key}
              </code>
              <Button
                variant="secondary"
                size="sm"
                icon={copied ? "check" : "content_copy"}
                onClick={() => copy(newKey?.key)}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowNewKeyModal(false)}>I have saved my key</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => handleRevoke(confirmState?.id)}
        title="Revoke API Key"
        message={`Are you sure you want to revoke "${confirmState?.name}"? This action cannot be undone. Any applications using this key will lose access immediately.`}
        confirmText="Revoke"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
