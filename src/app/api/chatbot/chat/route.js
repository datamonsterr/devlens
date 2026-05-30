import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";
import { getChatbotHistory, saveChatbotHistory } from "@/lib/db/repos/chatbotHistoryRepo.js";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const settings = await getSettings();

    const apiKey = settings.chatbotApiKey;
    const url = settings.chatbotUrl;
    const model = settings.chatbotModel;
    const systemPrompt = settings.chatbotSystemPrompt;

    if (!apiKey || !url) {
      return NextResponse.json(
        { error: "Chatbot not configured. Set API key and URL in settings." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage || !String(userMessage).trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Load persisted history (or use provided history if needed)
    const history = await getChatbotHistory();

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    
    // Add full history
    for (const msg of history) {
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    
    // Add current user message
    messages.push({ role: "user", content: String(userMessage).trim() });

    const temperature = Number(body.temperature) || settings.chatbotTemperature || 0.7;
    const maxTokens = Number(body.maxTokens) || settings.chatbotMaxTokens || 4096;
    const resolvedModel = body.model || model;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Upstream error (${response.status}): ${errText}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      data.content ||
      data.response ||
      JSON.stringify(data);

    // Save updated history (user message + assistant reply)
    history.push({ role: "user", content: String(userMessage).trim() });
    history.push({ role: "assistant", content: reply });
    
    // Keep last 100 messages to prevent infinite growth
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    await saveChatbotHistory(history);

    return NextResponse.json({ reply, history });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
