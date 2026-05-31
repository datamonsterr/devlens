import { NextResponse } from "next/server";
import { assertManager } from "@/lib/auth";
import { enableTunnel } from "@/lib/tunnel/tunnelManager";

const DNS_WARMUP_DELAY_MS = 8000;

function detectLocalPort() {
  const portEnv = parseInt(process.env.PORT, 10);
  if (portEnv) return portEnv;
  // Parse --port from next dev args: next dev --port 20262
  const argv = process.argv.join(" ");
  const match = argv.match(/--port\s+(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 20261;
}

export async function POST() {
  try {
    await assertManager();
    const port = detectLocalPort();
    const result = await enableTunnel(port);
    if (result.unsupported) return NextResponse.json(result, { status: 501 });
    await new Promise((r) => setTimeout(r, DNS_WARMUP_DELAY_MS));
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? 'Authentication required' : String(error));
    console.error("Tunnel enable error:", error);
    if (error instanceof Response) return error;
    if (error.isRateLimit) {
      return NextResponse.json({ error: msg, rateLimited: true, retryAfterSec: error.retryAfterSec || 300 }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
