import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { assertManager } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();
    await assertManager();

    const adapter = await getAdapter();
    const history = adapter.all(
      `SELECT action, amount, remainingAfter, timestamp
       FROM rtkPoolHistory
       WHERE teamId = ?
       ORDER BY timestamp DESC
       LIMIT 100`,
      [ctx.teamId]
    );

    return NextResponse.json({ history });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
