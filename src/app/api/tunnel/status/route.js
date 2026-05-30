import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getTunnelStatus, getDownloadStatus } from "@/lib/tunnel/tunnelManager";

export async function GET() {
  try {
    await requireTeamContext();
    const [tunnel] = await Promise.all([getTunnelStatus()]);
    const download = getDownloadStatus();
    return NextResponse.json({ tunnel, download });
  } catch (error) {
    const msg = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? 'Authentication required' : String(error));
    console.error("Tunnel status error:", error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
