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

  async function load() {
    const res = await fetch("/api/team/members");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load team");
    setMembers(data.members || []);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function invite() {
    setError("");
    const res = await fetch("/api/team/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Invitation failed"); return; }
    setEmail("");
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
      <Card>
        <div className="flex gap-2">
          <input className="flex-1 rounded border border-border bg-bg px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="developer@example.com" />
          <Button onClick={invite}>Invite developer</Button>
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-text-muted"><th className="py-2">Developer</th><th>Role</th><th>Status</th><th>API Keys</th><th>Last Used</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="py-3 font-mono text-xs">{m.clerkUserId}</td>
                  <td>{m.role}</td>
                  <td>{m.isActive ? "active" : "inactive"}</td>
                  <td>{m.activeApiKeyCount || 0}/{m.apiKeyCount || 0}</td>
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
