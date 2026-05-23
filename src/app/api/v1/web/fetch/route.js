import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { handleFetch } from "@/sse/handlers/fetch.js";

/**
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

/**
 * POST /v1/web/fetch - Web URL fetch/extract endpoint
 */
export async function POST(request) {
    const auth = await authenticateApiKey(request);
  if (auth.error) return auth.error;

  return await handleFetch(request);
}
