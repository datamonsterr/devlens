import { NextResponse } from "next/server";
import { getRecentLogs } from "@/lib/db";
import { requireTeamContext } from "@/lib/auth";

export async function GET() {
  try {
    const ctx = await requireTeamContext();
    const filter = ctx.role === "developer" ? { teamId: ctx.teamId, userId: ctx.userId } : { teamId: ctx.teamId };
    const logs = await getRecentLogs(200, filter);
    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error fetching logs:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
