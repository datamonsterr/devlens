import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { assertManager } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();

    const adapter = await getAdapter();
    const team = adapter.get(
      `SELECT rtkPool FROM teams WHERE id = ?`,
      [ctx.teamId]
    );

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({
      rtkPool: team.rtkPool,
      active: team.rtkPool > 0,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await assertManager();
    const ctx = await requireTeamContext();

    const body = await request.json();
    const { amount, mode } = body;

    if (typeof amount !== "number" || isNaN(amount)) {
      return NextResponse.json({ error: "amount must be a number" }, { status: 400 });
    }

    const adapter = await getAdapter();

    adapter.transaction(() => {
      const team = adapter.get(`SELECT rtkPool FROM teams WHERE id = ?`, [ctx.teamId]);
      if (!team) throw new Error("Team not found");

      let newPool;
      let action;

      if (mode === "reset") {
        newPool = Math.max(0, amount);
        action = "reset";
      } else {
        newPool = Math.max(0, team.rtkPool + amount);
        action = amount >= 0 ? "allocate" : "consume";
      }

      adapter.run(`UPDATE teams SET rtkPool = ?, updatedAt = ? WHERE id = ?`, [
        newPool,
        new Date().toISOString(),
        ctx.teamId,
      ]);

      adapter.run(
        `INSERT INTO rtkPoolHistory(teamId, action, amount, remainingAfter, timestamp) VALUES(?, ?, ?, ?, ?)`,
        [ctx.teamId, action, Math.abs(amount), newPool, new Date().toISOString()]
      );
    });

    const updated = adapter.get(`SELECT rtkPool FROM teams WHERE id = ?`, [ctx.teamId]);

    return NextResponse.json({
      rtkPool: updated.rtkPool,
      active: updated.rtkPool > 0,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
