import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { log } from "@/lib/logger";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

export async function POST(request) {
  await ensureInitialized();

  const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;

  log.info("V1", `Chat request: team=${auth.teamId} user=${auth.userId} role=${auth.role}`);
  return await handleChat(request, auth);
}

