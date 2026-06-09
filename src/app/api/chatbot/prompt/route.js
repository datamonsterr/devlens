import { NextResponse } from 'next/server';
import { buildPrompt } from '@/chatbot/index.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getToolSchemas } = await import('@/chatbot/toolExecutor.js');
    const toolSchemas = getToolSchemas();
    const prompt = buildPrompt({
      teamName: 'Current Team',
      tools: toolSchemas,
    });

    return NextResponse.json({
      prompt,
      toolCount: toolSchemas.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
