import { NextResponse } from "next/server";
import { getChatbotHistory, saveChatbotHistory, clearChatbotHistory } from "@/lib/db/repos/chatbotHistoryRepo.js";
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

export async function POST(request) {
  try {
    await assertManager();
    const body = await request.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    await saveChatbotHistory(body.messages);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
