import { NextResponse } from "next/server";
import { assertManager } from "@/lib/auth";
import { disableTunnel } from "@/lib/tunnel/tunnelManager";

export async function POST() {
  try {
    await assertManager();
    const result = await disableTunnel();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? 'Authentication required' : String(error));
    console.error("Tunnel disable error:", error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
