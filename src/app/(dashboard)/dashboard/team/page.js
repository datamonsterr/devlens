"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/shared/components";
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
        <h1 className="text-2xl font-semibold">Team Management</h1>
        <p className="text-sm text-text-muted mt-1">Invite developers, inspect API key metadata, and deactivate access.</p>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {notice && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">{notice}</div>}
      {newKey?.key && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
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
      <Card>
        <div className="flex gap-2">
          <input className="flex-1 rounded border border-border bg-bg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="developer@example.com" />
          <Button onClick={invite}>Invite developer</Button>
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text-muted"><th className="py-2">Developer</th><th>Role</th><th>Status</th><th>Invite</th><th>API Keys</th><th>Assigned Key</th><th>Last Used</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{m.email || m.clerkUserId || m.id}</td>
                  <td>{m.role}</td>
                  <td>{m.isActive ? "active" : "inactive"}</td>
                  <td className="text-xs">{m.inviteStatus || (m.clerkUserId ? "joined" : "—")}</td>
                  <td>{m.activeApiKeyCount || 0}/{m.apiKeyCount || 0}</td>
                  <td className="text-xs font-mono">{m.assignedApiKeyId ? (m.assignedApiKeyId.slice(0, 12) + "...") : (m.apiKeyCount > 0 ? "Yes" : "—")}</td>
                  <td>{m.lastKeyUsedAt || "never"}</td>
                  <td className="text-right"><Button variant="danger" size="sm" onClick={() => deactivate(m.id)}>Deactivate</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
