import { NextResponse } from "next/server";
import { getTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getTeamContext();
    if (!ctx || !ctx.isActive) {
      return NextResponse.json({ active: false }, { status: 200 });
    }

    const adapter = await getAdapter();
    const team = adapter.get(
      `SELECT rtkPool FROM teams WHERE id = ?`,
      [ctx.teamId]
    );

    return NextResponse.json({
      active: team ? team.rtkPool > 0 : false,
    });
  } catch {
    return NextResponse.json({ active: false }, { status: 200 });
  }
}
