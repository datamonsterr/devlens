import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const ctx = await requireManagerContext();
    const { id: userId } = await Promise.resolve(params);

    const db = await getAdapter();
    const member = await db.get(
      `SELECT u.id, u.clerkUserId, u.email, u.role, u.inviteStatus, u.onboardingEmailStatus, u.isActive, u.createdAt, u.updatedAt,
        (SELECT COUNT(*) FROM apiKeys ak WHERE ak.userId = u.id) as apiKeyCount,
        COALESCE((SELECT SUM(CASE WHEN ak.isActive = 1 THEN 1 ELSE 0 END) FROM apiKeys ak WHERE ak.userId = u.id), 0) as activeApiKeyCount,
        (SELECT COUNT(*) FROM usageHistory uh WHERE uh.userId = u.id AND uh.teamId = ?) as totalRequests,
        (SELECT SUM(uh.promptTokens + uh.completionTokens) FROM usageHistory uh WHERE uh.userId = u.id AND uh.teamId = ?) as totalTokens,
        (SELECT SUM(uh.cost) FROM usageHistory uh WHERE uh.userId = u.id AND uh.teamId = ?) as totalCost,
        (SELECT MAX(uh.timestamp) FROM usageHistory uh WHERE uh.userId = u.id AND uh.teamId = ?) as lastApiRequestAt,
        (SELECT COUNT(*) FROM usageHistory uh WHERE uh.userId = u.id AND uh.teamId = ? AND uh.status NOT IN ('ok', '200 OK', 'success', '200')) as errorCount
       FROM users u
       WHERE u.id = ? AND u.teamId = ?`,
      [ctx.teamId, ctx.teamId, ctx.teamId, ctx.teamId, ctx.teamId, userId, ctx.teamId]
    );

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const ctx = await requireManagerContext();
    const { id: userId } = await Promise.resolve(params);
    const body = await request.json();
    const { role, isActive } = body;

    const db = await getAdapter();
    const now = new Date().toISOString();

    const updates = [];
    const paramsUpdate = [];

    if (role !== undefined) {
      if (!['manager', 'developer'].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      if (role === 'developer' && userId === ctx.userId) {
        return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
      }
      if (role === 'developer') {
        const managerCount = await db.get(
          `SELECT COUNT(*) as c FROM users WHERE teamId = ? AND role = 'manager' AND isActive = 1`,
          [ctx.teamId]
        );
        if (!managerCount || managerCount.c <= 1) {
          return NextResponse.json({ error: "Team must have at least one manager" }, { status: 400 });
        }
      }
      updates.push("role = ?");
      paramsUpdate.push(role);
    }

    if (isActive !== undefined) {
      if (userId === ctx.userId) {
        return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });
      }
      if (isActive === false) {
        const managerCount = await db.get(
          `SELECT COUNT(*) as c FROM users WHERE teamId = ? AND role = 'manager' AND isActive = 1`,
          [ctx.teamId]
        );
        if (!managerCount || managerCount.c <= 1) {
          const target = await db.get(`SELECT role FROM users WHERE id = ? AND teamId = ?`, [userId, ctx.teamId]);
          if (target?.role === 'manager') {
            return NextResponse.json({ error: "Cannot deactivate the last manager" }, { status: 400 });
          }
        }
      }
      updates.push("isActive = ?");
      paramsUpdate.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.push("updatedAt = ?");
    paramsUpdate.push(now);

    const res = await db.run(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND teamId = ?`,
      [...paramsUpdate, userId, ctx.teamId]
    );

    if (res.changes === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
