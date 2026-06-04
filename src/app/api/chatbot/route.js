import { NextResponse } from "next/server";
import { assertManager, getTeamContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getTeamContext();
    return NextResponse.json({
      teamId: ctx?.teamId || null,
      teamName: ctx?.teamName || null,
      note: "Manager Chatbot uses team provider connections. No external API key configuration needed.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await assertManager();
    return NextResponse.json({
      success: true,
      note: "Chatbot now uses team provider connections. External API config is no longer needed.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
