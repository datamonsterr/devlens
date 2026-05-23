import { NextResponse } from "next/server";
import { getUsageHistory } from "@/lib/db";
import { requireTeamContext } from "@/lib/auth";

export async function GET(request) {
  try {
    const ctx = await requireTeamContext();
    const { searchParams } = new URL(request.url);

    const filter = { teamId: ctx.teamId };
    if (ctx.role === "developer") filter.userId = ctx.userId;
    if (searchParams.get("provider")) filter.provider = searchParams.get("provider");
    if (searchParams.get("model")) filter.model = searchParams.get("model");
    if (searchParams.get("startDate")) filter.startDate = searchParams.get("startDate");
    if (searchParams.get("endDate")) filter.endDate = searchParams.get("endDate");

    const history = await getUsageHistory(filter);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching usage history:", error);
    return NextResponse.json({ error: "Failed to fetch usage history" }, { status: 500 });
  }
}
