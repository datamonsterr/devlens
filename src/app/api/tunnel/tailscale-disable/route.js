import { NextResponse } from "next/server";
import { assertManager } from "@/lib/auth";
import { disableTailscale } from "@/lib/tunnel/tunnelManager";

export async function POST() {
  try {
    await assertManager();
    const result = await disableTailscale();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Tailscale disable error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
