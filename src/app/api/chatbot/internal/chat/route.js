import { requireManagerContext } from '@/lib/auth/teamContext.js';
import { buildPrompt, executeTool, getToolSchemas } from '@/chatbot/index.js';
import { getChatbotHistory, saveChatbotHistory } from '@/lib/db/repos/chatbotHistoryRepo.js';
import { getComboModels } from '@/sse/services/model.js';
import { getProviderCredentials, clearAccountError } from '@/sse/services/auth.js';
import { handleChatCore } from 'open-sse/handlers/chatCore.js';
import { handleComboChat } from 'open-sse/services/combo.js';

export const dynamic = 'force-dynamic';

const MAX_TOOL_ROUNDS = 3;

export async function POST(request) {
  try {
    const ctx = await requireManagerContext();

    const body = await request.json();
    const { messages, model: selectedModel } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toolSchemas = getToolSchemas();
    const systemPrompt = buildPrompt({
      teamName: ctx.teamName,
      tools: toolSchemas,
    });

    const systemMessage = { role: 'system', content: systemPrompt };
    const allMessages = [systemMessage, ...messages];

    const model = selectedModel || await getDefaultModel(ctx.teamId);

    const stream = body.stream !== false;

    return stream
      ? handleStreamingChat(allMessages, model, ctx, toolSchemas)
      : handleNonStreamingChat(allMessages, model, ctx, toolSchemas);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[chatbot] Chat error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getDefaultModel(teamId) {
  try {
    const { getCombos } = await import('@/lib/db/repos/combosRepo.js');
    const combos = await getCombos(teamId);
    if (combos.length > 0) return combos[0].name;
  } catch {}

  return 'openai/gpt-4o';
}

async function callModel(messages, model, ctx, tools) {
  const callBody = {
    model,
    messages,
    stream: false,
  };

  if (tools && tools.length > 0) {
    callBody.tools = tools;
    callBody.tool_choice = 'auto';
  }

  const comboModels = await getComboModels(model, ctx.teamId);
  let response;

  if (comboModels) {
    response = await handleComboChat({
      body: callBody,
      models: comboModels,
      handleSingleModel: (b, m) => callSingleModel(b, m, ctx),
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} },
      comboName: model,
      comboStrategy: 'fallback',
    });
  } else {
    response = await callSingleModel(callBody, model, ctx);
  }

  if (!response || !response.ok) {
    const text = response ? await response.text() : 'No response';
    throw new Error(`Model call failed: ${text}`);
  }

  return response.json();
}

async function callSingleModel(body, modelStr, ctx) {
  const { parseModel } = await import('@/sse/services/model.js');
  const parsed = parseModel(modelStr);
  const provider = parsed?.provider || modelStr;

  const creds = await getProviderCredentials(provider, [], modelStr, { teamId: ctx.teamId });
  if (!creds) {
    return new Response(JSON.stringify({ error: `No provider connection found for ${modelStr}` }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await handleChatCore({
      body,
      provider: creds.provider || provider,
      model: parsed?.model || modelStr,
      credentials: creds,
      apiKey: creds.apiKey,
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} },
    });

    await clearAccountError(creds.connectionId, creds, modelStr);

    return response;
  } catch (error) {
    if (creds.connectionId) {
      const { markAccountUnavailable } = await import('@/sse/services/auth.js');
      await markAccountUnavailable(creds.connectionId, 'error', error.message, provider, modelStr);
    }
    throw error;
  }
}

async function handleStreamingChat(messages, model, ctx, toolSchemas) {
  const encoder = new TextEncoder();
  let currentMessages = [...messages];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let round = 0;

        while (round < MAX_TOOL_ROUNDS) {
          round++;

          const data = await callModel(currentMessages, model, ctx, toolSchemas);

          const choice = data.choices?.[0];
          if (!choice) {
            sendEvent(controller, 'error', 'No response from model');
            break;
          }

          const toolCalls = choice.message?.tool_calls;

          if (toolCalls && toolCalls.length > 0) {
            for (const tc of toolCalls) {
              const toolName = tc.function?.name;
              let toolArgs = {};

              try {
                toolArgs = JSON.parse(tc.function?.arguments || '{}');
              } catch {
                toolArgs = {};
              }

              sendEvent(controller, 'tool_call', {
                id: tc.id,
                name: toolName,
                arguments: toolArgs,
              });

              const result = await executeTool(toolName, toolArgs, {
                teamId: ctx.teamId,
                teamName: ctx.teamName,
                userId: ctx.userId,
              });

              sendEvent(controller, 'tool_result', {
                id: tc.id,
                name: toolName,
                result,
              });

              currentMessages.push({
                role: 'assistant',
                content: null,
                tool_calls: [tc],
              });
              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }

            continue;
          }

          const content = choice.message?.content || '';
          sendEvent(controller, 'text_delta', { content });
          sendEvent(controller, 'done', {});

          const assistantMsg = { role: 'assistant', content };
          const historyMessages = messages.slice();
          historyMessages.push(assistantMsg);

          for (let i = currentMessages.length - 1; i >= messages.length; i--) {
            const msg = currentMessages[i];
            if (msg.role === 'tool') {
              historyMessages.splice(historyMessages.length, 0, {
                role: 'tool_call',
                tool_name: msg.tool_call_id,
                content: msg.content,
              });
            }
          }

          saveChatbotHistory(historyMessages).catch(() => {});

          break;
        }

        if (round >= MAX_TOOL_ROUNDS) {
          sendEvent(controller, 'done', { maxRounds: true });
        }

        controller.close();
      } catch (error) {
        sendEvent(controller, 'error', { message: error.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

async function handleNonStreamingChat(messages, model, ctx, toolSchemas) {
  try {
    let currentMessages = [...messages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callModel(currentMessages, model, ctx, toolSchemas);

      const choice = data.choices?.[0];
      if (!choice) {
        return NextResponse.json({ error: 'No response from model' }, { status: 502 });
      }

      const toolCalls = choice.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        const toolResults = [];

        for (const tc of toolCalls) {
          const toolName = tc.function?.name;
          let toolArgs = {};

          try {
            toolArgs = JSON.parse(tc.function?.arguments || '{}');
          } catch {}

          const result = await executeTool(toolName, toolArgs, {
            teamId: ctx.teamId,
            teamName: ctx.teamName,
            userId: ctx.userId,
          });

          toolResults.push({ id: tc.id, name: toolName, arguments: toolArgs, result });

          currentMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: [tc],
          });
          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        if (round === MAX_TOOL_ROUNDS - 1) {
          return NextResponse.json({
            content: 'Tool execution complete. Max rounds reached.',
            toolCalls: toolResults,
          });
        }

        continue;
      }

      const content = choice.message?.content || '';
      const historyMessages = messages.slice();
      historyMessages.push({ role: 'assistant', content });
      saveChatbotHistory(historyMessages).catch(() => {});

      return NextResponse.json({ content });
    }

    return NextResponse.json({ content: 'Max tool rounds reached.', maxRounds: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function sendEvent(controller, type, data) {
  const event = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(event));
}
