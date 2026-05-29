import { NextResponse } from "next/server";
import { requireManagerContext, requireTeamContext } from "@/lib/auth";
import { getModelAliases, setModelAlias, deleteModelAlias } from "@/models";
import { writeAuditLog } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/models/alias - Get all aliases
export async function GET() {
  try {
    const ctx = await requireTeamContext();
    const aliases = await getModelAliases(ctx.teamId);
    return NextResponse.json({ aliases });
  } catch (error) {
    console.log("Error fetching aliases:", error);
    return NextResponse.json({ error: "Failed to fetch aliases" }, { status: 500 });
  }
}

// PUT /api/models/alias - Set model alias
export async function PUT(request) {
  try {
    const ctx = await requireManagerContext();
    const body = await request.json();
    const { model, alias } = body;

    if (!model || !alias) {
      return NextResponse.json({ error: "Model and alias required" }, { status: 400 });
    }

    await setModelAlias(alias, model, ctx.teamId);

    await writeAuditLog({
      teamId: ctx.teamId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "set",
      resource: "modelAlias",
      resourceId: alias,
      payload: { alias, model },
    }).catch(() => {});

    return NextResponse.json({ success: true, model, alias });
  } catch (error) {
    console.log("Error updating alias:", error);
    return NextResponse.json({ error: "Failed to update alias" }, { status: 500 });
  }
}

// DELETE /api/models/alias?alias=xxx - Delete alias
export async function DELETE(request) {
  try {
    const ctx = await requireManagerContext();
    const { searchParams } = new URL(request.url);
    const alias = searchParams.get("alias");

    if (!alias) {
      return NextResponse.json({ error: "Alias required" }, { status: 400 });
    }

    await deleteModelAlias(alias, ctx.teamId);

    await writeAuditLog({
      teamId: ctx.teamId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "delete",
      resource: "modelAlias",
      resourceId: alias,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("Error deleting alias:", error);
    return NextResponse.json({ error: "Failed to delete alias" }, { status: 500 });
  }
}
