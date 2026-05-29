import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getRequestDetails } from "@/lib/db/repos/requestDetailsRepo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const ctx = await requireManagerContext();
    const { searchParams } = new URL(request.url);

    const filter = {
      teamId: ctx.teamId,
      userId: searchParams.get("userId") || undefined,
      provider: searchParams.get("provider") || undefined,
      model: searchParams.get("model") || undefined,
      endpoint: searchParams.get("endpoint") || undefined,
      status: searchParams.get("status") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
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
