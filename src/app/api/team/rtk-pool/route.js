import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { assertManager } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { writeAuditLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();

    const adapter = await getAdapter();
    const team = await adapter.get(
      `SELECT rtkPool FROM teams WHERE id = ?`,
      [ctx.teamId]
    );

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const history = await adapter.all(
      `SELECT action, amount, remainingAfter, timestamp FROM rtkPoolHistory WHERE teamId = ? ORDER BY timestamp DESC, id DESC LIMIT 50`,
      [ctx.teamId]
    );

    return NextResponse.json({
      rtkPool: team.rtkPool,
      active: team.rtkPool > 0,
      history,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await assertManager();
    const ctx = await requireTeamContext();

    const body = await request.json();
    const { amount, mode } = body;

    if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "amount must be an integer" }, { status: 400 });
    }
    if (amount < 0) {
      return NextResponse.json({ error: "amount must be non-negative" }, { status: 400 });
    }
    if (mode && mode !== "topup" && mode !== "reset") {
      return NextResponse.json({ error: "mode must be topup or reset" }, { status: 400 });
    }

    const adapter = await getAdapter();

    await adapter.transaction(async () => {
      const team = await adapter.get(`SELECT rtkPool FROM teams WHERE id = ?`, [ctx.teamId]);
      if (!team) throw new Error("Team not found");

      let newPool;
      let action;

      if (mode === "reset") {
        newPool = Math.max(0, amount);
        action = "reset";
      } else {
        newPool = team.rtkPool + amount;
        action = "allocate";
      }

      await adapter.run(`UPDATE teams SET rtkPool = ?, updatedAt = ? WHERE id = ?`, [
        newPool,
        new Date().toISOString(),
        ctx.teamId,
      ]);

      await adapter.run(
        `INSERT INTO rtkPoolHistory(teamId, action, amount, remainingAfter, timestamp) VALUES(?, ?, ?, ?, ?)`,
        [ctx.teamId, action, Math.abs(amount), newPool, new Date().toISOString()]
      );
    });

    const updated = await adapter.get(`SELECT rtkPool FROM teams WHERE id = ?`, [ctx.teamId]);

    await writeAuditLog({
      teamId: ctx.teamId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: mode === "reset" ? "reset" : "topup",
      resource: "rtkPool",
      payload: { amount, mode: mode || "topup", newPool: updated.rtkPool },
    }).catch(() => {});

    return NextResponse.json({
      rtkPool: updated.rtkPool,
      active: updated.rtkPool > 0,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
