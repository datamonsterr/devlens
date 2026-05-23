import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { handleTts } from "@/sse/handlers/tts.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/audio/speech - OpenAI-compatible TTS endpoint */
export async function POST(request) {
    const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;

  return await handleTts(request);
}
