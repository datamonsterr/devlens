import { getAdapter } from "@/lib/db/driver";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { verifyDashboardAuthToken } from "./dashboardSession.js";
import { log } from "@/lib/logger";

function toTeamRole(orgRole, sessionClaims) {
  const metadataRole = sessionClaims?.public_metadata?.role || sessionClaims?.unsafe_metadata?.role;
  if (metadataRole === "manager" || metadataRole === "developer") return metadataRole;
  if (orgRole === "org:admin") return "manager";
  return "developer";
}

async function ensureTeam(adapter, orgId, sessionClaims) {
  const existing = await adapter.get(
    `SELECT id, name, clerkOrgId, rtkPool FROM teams WHERE clerkOrgId = ?`,
    [orgId]
  );
  if (existing) {
    log.debug("TEAM", `Found existing team ${existing.id} (${existing.name}) for org ${orgId}`);
    return existing;
  }

  const teamId = uuidv4();
  const now = new Date().toISOString();
  const teamName = sessionClaims?.org_name || sessionClaims?.organization?.name || "My Team";
  await adapter.run(
    `INSERT INTO teams(id, name, clerkOrgId, rtkPool, createdAt, updatedAt) VALUES(?, ?, ?, 0, ?, ?)`,
    [teamId, teamName, orgId, now, now]
  );
  log.info("TEAM", `Created new team ${teamId} (${teamName}) for org ${orgId}`);
  return { id: teamId, name: teamName, clerkOrgId: orgId, rtkPool: 0 };
}

async function ensureUser(adapter, clerkUserId, teamId, role) {
  const existing = await adapter.get(
    `SELECT id, role, isActive FROM users WHERE clerkUserId = ? AND teamId = ?`,
    [clerkUserId, teamId]
  );
  if (existing) {
    log.debug("USER", `Found existing user ${existing.id} role=${existing.role}`);
    return existing;
  }

  const globalUser = await adapter.get(
    `SELECT id FROM users WHERE clerkUserId = ?`,
    [clerkUserId]
  );
  const now = new Date().toISOString();
  if (globalUser) {
    await adapter.run(
      `UPDATE users SET teamId = ?, role = ?, isActive = 1, updatedAt = ? WHERE clerkUserId = ?`,
      [teamId, role, now, clerkUserId]
    );
    log.info("USER", `Migrated global user ${globalUser.id} to team ${teamId} role=${role}`);
    return { id: globalUser.id, role, isActive: 1 };
  }

  const userId = uuidv4();
  await adapter.run(
    `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
    [userId, clerkUserId, teamId, role, now, now]
  );
  log.info("USER", `Created new user ${userId} clerk=${clerkUserId} team=${teamId} role=${role}`);
  return { id: userId, role, isActive: 1 };
}

async function getLocalDevContext() {
  if (process.env.NODE_ENV !== "development" || process.env.DEVLENS_LOCAL_AUTH_FALLBACK === "false") return null;
  const token = (await cookies()).get("auth_token")?.value;
  if (!(await verifyDashboardAuthToken(token))) {
    log.debug("TEAM", "Local dev fallback: no valid auth_token");
    return null;
  }

  log.info("TEAM", "Using local dev fallback auth context");
  const adapter = await getAdapter();
  const sessionClaims = { org_name: "Local Dev Team" };
  const team = await ensureTeam(adapter, "local-dev", sessionClaims);
  const user = await ensureUser(adapter, "local-dev-manager", team.id, "manager");
  return {
    teamId: team.id,
    teamName: team.name,
    clerkOrgId: team.clerkOrgId,
    rtkPool: team.rtkPool,
    userId: user.id,
    role: user.role,
    isActive: user.isActive === 1,
  };
}

export async function getTeamContext() {
  const { userId, orgId, orgRole, sessionClaims } = await auth();
  if (!userId || !orgId) {
    log.debug("TEAM", "No Clerk session, trying local dev fallback");
    return getLocalDevContext();
  }
  const memberships = sessionClaims?.orgs || sessionClaims?.organizations || null;
  if (Array.isArray(memberships) && memberships.length !== 1) {
    log.warn("TEAM", `User ${userId} has ${memberships.length} orgs, expected 1`);
    return null;
  }

  const adapter = await getAdapter();
  const team = await ensureTeam(adapter, orgId, sessionClaims);
  const role = toTeamRole(orgRole, sessionClaims);
  const user = await ensureUser(adapter, userId, team.id, role);

  log.info("TEAM", `Resolved context: team=${team.id} user=${user.id} role=${role}`);
  return {
    teamId: team.id,
    teamName: team.name,
    clerkOrgId: team.clerkOrgId,
    rtkPool: team.rtkPool,
    userId: user.id,
    role: user.role,
    isActive: user.isActive === 1,
  };
}

export async function requireTeamContext() {
  const ctx = await getTeamContext();
  if (!ctx) throw new Response(JSON.stringify({ error: "Team context not found" }), { status: 403, headers: { "Content-Type": "application/json" } });
  if (!ctx.isActive) throw new Response(JSON.stringify({ error: "Account inactive" }), { status: 403, headers: { "Content-Type": "application/json" } });
  return ctx;
}

export async function requireTeamRole(allowedRoles) {
  const ctx = await requireTeamContext();
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const hierarchy = { manager: 2, developer: 1 };
  if (!ctx.role || !allowed.some((role) => ctx.role === role || hierarchy[ctx.role] >= hierarchy[role])) {
    throw new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  return ctx;
}

export async function requireManagerContext() {
  return requireTeamRole("manager");
}
