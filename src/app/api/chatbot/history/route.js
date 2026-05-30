import { NextResponse } from "next/server";
import { getChatbotHistory, clearChatbotHistory } from "@/lib/db/repos/chatbotHistoryRepo.js";
import { assertManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await assertManager();
    const history = await getChatbotHistory();
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await assertManager();
    await clearChatbotHistory();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
