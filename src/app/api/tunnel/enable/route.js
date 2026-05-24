import { NextResponse } from "next/server";
import { assertManager } from "@/lib/auth";
import { enableTunnel } from "@/lib/tunnel/tunnelManager";

const DNS_WARMUP_DELAY_MS = 8000;

export async function POST() {
  try {
    await assertManager();
    const result = await enableTunnel();
    if (result.unsupported) return NextResponse.json(result, { status: 501 });
    // Wait for DNS warmup to propagate at Cloudflare edge after tunnel registered
    await new Promise((r) => setTimeout(r, DNS_WARMUP_DELAY_MS));
    return NextResponse.json(result);
  } catch (error) {
    console.error("Tunnel enable error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
