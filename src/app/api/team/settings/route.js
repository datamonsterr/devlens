import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { requireTeamContext } from "@/lib/auth";

export async function GET() {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const adapter = await getAdapter();
    let settings = await adapter.get(
      `SELECT maxKeysPerDeveloper, data FROM teamSettings WHERE teamId = ?`,
      [ctx.teamId]
    );

    if (!settings) {
      settings = { maxKeysPerDeveloper: 5, data: "{}" };
    }

    return NextResponse.json({ settings: { ...settings, data: JSON.parse(settings.data || "{}") } });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const adapter = await getAdapter();

    await adapter.run(
      `INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, ?, ?) ON CONFLICT(teamId) DO UPDATE SET maxKeysPerDeveloper = excluded.maxKeysPerDeveloper, data = excluded.data`,
      [ctx.teamId, body.maxKeysPerDeveloper || 5, JSON.stringify(body.data || {})]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
