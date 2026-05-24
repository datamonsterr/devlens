"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Badge } from "@/shared/components";
import RoleGuard from "@/shared/components/RoleGuard";

export default function TeamPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <TeamContent />
    </RoleGuard>
  );
}

function TeamContent() {
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newKey, setNewKey] = useState(null);

  async function load() {
    const res = await fetch("/api/team/members");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load team");
    setMembers(data.members || []);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function invite() {
    setError("");
    setNotice("");
    setNewKey(null);
    const res = await fetch("/api/team/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Invitation failed"); return; }
    setEmail("");
    if (data.apiKey?.key) {
      setNewKey(data.apiKey);
    }
    setNotice(`Invited ${data.invited}. Onboarding email: ${data.onboardingEmailStatus || "skipped"}.`);
    await load();
  }

  async function deactivate(userId) {
    await fetch(`/api/team/members?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Management</h1>
        <p className="mt-1 text-sm text-text-muted">Invite Developers, monitor status, and deactivate access when needed.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Members</p>
          <p className="mt-2 text-2xl font-semibold">{members.length}</p>
          <p className="text-xs text-text-muted">Team records</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{members.filter((m) => m.isActive).length}</p>
          <p className="text-xs text-text-muted">Current access</p>
        </Card>
        <Card padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600 dark:text-rose-300">{members.filter((m) => !m.isActive).length}</p>
          <p className="text-xs text-text-muted">Removed users</p>
        </Card>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600 dark:border-green-900/70 dark:bg-green-950/60 dark:text-green-300">{notice}</div>}
      {newKey?.key && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">key</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Initial Developer Key created — copy it now
              </p>
              <code className="block mt-1 text-xs font-mono text-amber-700 dark:text-amber-300 break-all">
                {newKey.key}
              </code>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Store this key safely. You will not see the full key again.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card padding="md">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@example.com"
            icon="mail"
          />
          <Button onClick={invite} className="w-full sm:w-auto">Invite Developer</Button>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/70">
              <tr className="text-left text-text-muted">
                <th className="px-4 py-3 font-medium">Developer</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Invite</th>
                <th className="px-4 py-3 font-medium">API Keys</th>
                <th className="px-4 py-3 font-medium">Assigned Key</th>
                <th className="px-4 py-3 font-medium">Last Used</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border-subtle/80">
                  <td className="px-4 py-3 font-mono text-xs">{m.email || m.clerkUserId || m.id}</td>
                  <td className="px-4 py-3">{m.role}</td>
                  <td className="px-4 py-3">
                    {m.isActive ? (
                      <Badge variant="success" size="sm" dot>Active</Badge>
                    ) : (
                      <Badge variant="error" size="sm" dot>Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{m.inviteStatus || (m.clerkUserId ? "joined" : "—")}</td>
                  <td className="px-4 py-3">{m.activeApiKeyCount || 0}/{m.apiKeyCount || 0}</td>
                  <td className="px-4 py-3 text-xs font-mono text-text-muted">{m.assignedApiKeyId ? (m.assignedApiKeyId.slice(0, 12) + "...") : (m.apiKeyCount > 0 ? "Yes" : "—")}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{m.lastKeyUsedAt || "never"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" size="sm" onClick={() => deactivate(m.id)}>Deactivate</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
