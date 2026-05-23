import { NextResponse } from "next/server";
import { assertManager } from "@/lib/auth";
import { getTunnelStatus } from "@/lib/tunnel/tunnelManager";
import { getDownloadStatus } from "@/lib/tunnel/cloudflared";

export async function GET() {
  try {
    await assertManager();
    const [tunnel] = await Promise.all([getTunnelStatus()]);
    const download = getDownloadStatus();
    return NextResponse.json({ tunnel, download });
  } catch (error) {
    console.error("Tunnel status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
