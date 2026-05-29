import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getMemberUsage } from "@/lib/db/repos/usageRepo";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const ctx = await requireManagerContext();
    const { id: userId } = await Promise.resolve(params);
    const { searchParams } = new URL(request.url);

    const db = await getAdapter();
    const user = await db.get(
      `SELECT id FROM users WHERE id = ? AND teamId = ?`,
      [userId, ctx.teamId]
    );

    if (!user) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const filter = {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    };

    const usage = await getMemberUsage(ctx.teamId, userId, filter);

    return NextResponse.json(usage);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
