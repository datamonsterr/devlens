import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const ctx = await requireTeamContext();
    const { id } = await params;

    const adapter = await getAdapter();
    const key = ctx.role === "manager"
      ? await adapter.get(
        `SELECT id, name, isActive, lastUsedAt, createdAt, userId FROM apiKeys WHERE id = ? AND teamId = ?`,
        [id, ctx.teamId]
      )
      : await adapter.get(
        `SELECT id, name, isActive, lastUsedAt, createdAt FROM apiKeys WHERE id = ? AND userId = ?`,
        [id, ctx.userId]
      );

    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ key: { ...key, isActive: key.isActive === 1 } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const ctx = await requireTeamContext();
    const { id } = await params;

    const adapter = await getAdapter();

    if (ctx.role === "manager") {
      await adapter.run(`UPDATE apiKeys SET isActive = 0 WHERE id = ? AND teamId = ?`, [id, ctx.teamId]);
    } else {
      await adapter.run(`UPDATE apiKeys SET isActive = 0 WHERE id = ? AND userId = ?`, [id, ctx.userId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
