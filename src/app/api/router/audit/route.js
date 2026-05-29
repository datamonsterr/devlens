import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAuditLog } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const ctx = await requireManagerContext();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const resource = searchParams.get("resource") || undefined;

    const entries = await getAuditLog(ctx.teamId, { limit, offset, resource });
    return NextResponse.json({ entries });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
