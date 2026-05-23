import { getAdapter } from "@/lib/db/driver";
import { auth } from "@clerk/nextjs/server";

export async function getTeamContext() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId || !orgId) return null;
  const memberships = sessionClaims?.orgs || sessionClaims?.organizations || null;
  if (Array.isArray(memberships) && memberships.length !== 1) return null;

  const adapter = await getAdapter();
  const team = adapter.get(
    `SELECT id, name, clerkOrgId, rtkPool FROM teams WHERE clerkOrgId = ?`,
    [orgId]
  );

  if (!team) return null;

  const user = adapter.get(
    `SELECT id, role, isActive FROM users WHERE clerkUserId = ? AND teamId = ?`,
    [userId, team.id]
  );

  return {
    teamId: team.id,
    teamName: team.name,
    clerkOrgId: team.clerkOrgId,
    rtkPool: team.rtkPool,
    userId: user?.id || null,
    role: user?.role || null,
    isActive: user?.isActive === 1,
  };
}

export async function requireTeamContext() {
  const ctx = await getTeamContext();
  if (!ctx) throw new Response(JSON.stringify({ error: "Team context not found" }), { status: 403 });
  if (!ctx.isActive) throw new Response(JSON.stringify({ error: "Account inactive" }), { status: 403 });
  return ctx;
}

export async function requireTeamRole(allowedRoles) {
  const ctx = await requireTeamContext();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hierarchy = { manager: 2, developer: 1 };
  if (!ctx.role || !allowed.some((role) => ctx.role === role || hierarchy[ctx.role] >= hierarchy[role])) {
    throw new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403 });
  }
  return ctx;
}

export async function requireManagerContext() {
  return requireTeamRole("manager");
}
