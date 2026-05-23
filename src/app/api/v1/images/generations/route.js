import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { handleImageGeneration } from "@/sse/handlers/imageGeneration.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/images/generations - OpenAI-compatible image generation endpoint */
export async function POST(request) {
    const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;

  return await handleImageGeneration(request);
}
