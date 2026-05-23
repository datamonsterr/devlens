import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();

    const adapter = await getAdapter();
    const team = adapter.get(
      `SELECT id, name, clerkOrgId, rtkPool, createdAt, updatedAt FROM teams WHERE id = ?`,
      [ctx.teamId]
    );

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const adapter = await getAdapter();
    const now = new Date().toISOString();

    if (body.name) {
      adapter.run(`UPDATE teams SET name = ?, updatedAt = ? WHERE id = ?`, [body.name, now, ctx.teamId]);
    }

    const team = adapter.get(
      `SELECT id, name, clerkOrgId, rtkPool, createdAt, updatedAt FROM teams WHERE id = ?`,
      [ctx.teamId]
    );

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
