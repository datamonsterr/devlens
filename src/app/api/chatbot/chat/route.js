import { NextResponse } from "next/server";
import { getChatbotHistory } from "@/lib/db/repos/chatbotHistoryRepo.js";
import { assertManager } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await assertManager();
    const body = await request.json();

    if (!body.message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    return NextResponse.json({
      reply: "The external chatbot has been replaced by the internal Manager Assistant. Please use the chat interface on this page to interact with the Devlens Assistant.",
      note: "Redirect to /dashboard/chatbot",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
