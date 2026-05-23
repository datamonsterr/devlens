import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const ctx = await requireManagerContext();
    const { userId } = await params;
    const db = await getAdapter();
    const user = await db.get(`SELECT id FROM users WHERE id = ? AND teamId = ?`, [userId, ctx.teamId]);
    if (!user) return NextResponse.json({ error: "Developer not found" }, { status: 404 });
    const rows = await db.all(
      `SELECT timestamp, provider, model, endpoint, status, promptTokens, completionTokens, cost FROM usageHistory WHERE teamId = ? AND userId = ? ORDER BY timestamp DESC LIMIT 200`,
      [ctx.teamId, userId]
    );
    return NextResponse.json({ usage: rows });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
