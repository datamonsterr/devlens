import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getRequestDetails } from "@/lib/db/repos/requestDetailsRepo";
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
      teamId: ctx.teamId,
      userId,
      provider: searchParams.get("provider"),
      model: searchParams.get("model"),
      endpoint: searchParams.get("endpoint"),
      status: searchParams.get("status"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "50", 10),
    };

    const logs = await getRequestDetails(filter);

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
