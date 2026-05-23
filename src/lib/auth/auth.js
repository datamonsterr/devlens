import { auth } from "@clerk/nextjs/server";
import { requireManagerContext, requireTeamRole } from "./teamContext.js";

export async function getUserAuth() {
  const { userId, orgId, sessionClaims } = await auth();
  if (!userId) return { userId: null, orgId: null, role: null };

  return {
    userId,
    orgId,
    role: (sessionClaims?.public_metadata?.role) || (sessionClaims?.unsafe_metadata?.role) || null,
  };
}

const ROLE_HIERARCHY = {
  manager: 2,
  developer: 1,
};

export function requireRole(allowedRoles) {
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async function handler() {
    const { role } = await getUserAuth();
    if (!role) return { error: "Unauthorized", status: 401 };
    if (!allowed.includes(role) && !allowed.some((r) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[r])) {
      return { error: "Insufficient permissions", status: 403 };
    }
    return null;
  };
}

export function requireManager() {
  return requireRole("manager");
}

export async function assertRole(allowedRoles) {
  await requireTeamRole(allowedRoles);
}

export async function assertManager() {
  await requireManagerContext();
}
