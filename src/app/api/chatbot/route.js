import { NextResponse } from "next/server";
import { assertManager, getTeamContext } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/localDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      apiKey: settings.chatbotApiKey ? "••••••••" : "",
      hasApiKey: !!settings.chatbotApiKey,
      url: settings.chatbotUrl || "",
      model: settings.chatbotModel || "",
      systemPrompt: settings.chatbotSystemPrompt || "",
      temperature: settings.chatbotTemperature ?? 0.7,
      maxTokens: settings.chatbotMaxTokens ?? 4096,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await assertManager();
    const body = await request.json();

    const updates = {};
    if (body.apiKey !== undefined) {
      updates.chatbotApiKey = body.apiKey || null;
    }
    if (body.url !== undefined) {
      updates.chatbotUrl = body.url || null;
    }
    if (body.model !== undefined) {
      updates.chatbotModel = body.model || null;
    }
    if (body.systemPrompt !== undefined) {
      updates.chatbotSystemPrompt = body.systemPrompt || null;
    }
    if (body.temperature !== undefined) {
      updates.chatbotTemperature = Number(body.temperature) || 0.7;
    }
    if (body.maxTokens !== undefined) {
      updates.chatbotMaxTokens = Number(body.maxTokens) || 4096;
    }

    await updateSettings(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
