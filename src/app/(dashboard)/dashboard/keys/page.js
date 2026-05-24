"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Input, Modal, Badge, ConfirmModal } from "@/shared/components";
import { useRole } from "@/shared/hooks/useRole";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function KeysPage() {
  const { isManager, isDeveloper } = useRole();
  const [keys, setKeys] = useState([]);
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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

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
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-surface-2 rounded" />
          <div className="h-24 bg-surface-2 rounded-xl" />
          <div className="h-24 bg-surface-2 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-text-muted mt-1">
            {isManager
              ? "Manage all team API keys"
              : "Create and manage your API keys for /v1/* access"}
          </p>
        </div>
        {isDeveloper && (
          <Button icon="add" onClick={() => { setError(null); setShowCreateModal(true); }} className="w-full sm:w-auto">
            Create Key
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {keys.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">key</span>
            </div>
            <h3 className="text-lg font-medium">No API Keys</h3>
            <p className="text-sm text-text-muted mt-2">
              {isDeveloper
                ? "Create an API key to access the /v1/* API endpoints"
                : "No API keys have been created by team developers yet"}
            </p>
            {isDeveloper && (
              <Button
                icon="add"
                onClick={() => { setError(null); setShowCreateModal(true); }}
                className="mt-4"
              >
                Create Your First Key
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map((key) => (
            <Card key={key.id} padding="sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${key.isActive ? "bg-primary/10 text-primary" : "bg-red-100 text-red-500 dark:bg-red-900/30"}`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {key.isActive ? "key" : "key_off"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-medium truncate">{key.name}</code>
                      {key.isActive ? (
                        <Badge variant="success" size="sm" dot>Active</Badge>
                      ) : (
                        <Badge variant="error" size="sm" dot>Revoked</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-text-muted flex-wrap">
                      <span className="font-mono text-[11px]">{key.id}</span>
                      {isManager && key.userId && (
                        <span className="font-mono text-[11px] truncate max-w-[160px]" title={key.userId}>
                          User: {key.userId.slice(0, 8)}...
                        </span>
                      )}
                      <span>Created: {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && (
                        <span>Last used: {formatDate(key.lastUsedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {key.isActive && (
                    <>
                      <button
                        onClick={() => handleRotate(key.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Rotate key"
                      >
                        <span className="material-symbols-outlined text-[16px]">autorenew</span>
                        Rotate
                      </button>
                      <button
                        onClick={() => setConfirmState({ id: key.id, name: key.name })}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Revoke key"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create API Key">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Key Name</label>
            <Input
              placeholder="e.g. Production CLI Key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-text-muted mt-1">
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

      {/* New Key Reveal Modal */}
      <Modal isOpen={showNewKeyModal} onClose={() => setShowNewKeyModal(false)} title="API Key Created">
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 dark:bg-amber-950 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Copy this key now — you won&apos;t see it again!
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  For security, the full key is only shown once. Store it safely.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Key Name</label>
            <code className="block text-sm font-mono">{newKey?.name}</code>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 block px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 font-mono text-sm break-all">
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
            <Button onClick={() => setShowNewKeyModal(false)}>
              I&apos;ve Saved My Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation */}
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
