import { NextResponse } from "next/server";
import { requireManagerContext, requireTeamContext } from "@/lib/auth";
import { getCombos, createCombo, getComboByName } from "@/lib/localDb";
import { writeAuditLog } from "@/lib/db";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// GET /api/combos - Get all combos
export async function GET() {
  try {
    const ctx = await requireTeamContext();
    const combos = await getCombos(ctx.teamId);
    return NextResponse.json({ combos });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

// POST /api/combos - Create new combo
export async function POST(request) {
  try {
    const ctx = await requireManagerContext();
    const body = await request.json();
    const { name, models, kind } = body;

    log.info("COMBO", `Manager ${ctx.userId} creating combo ${name} with ${models?.length || 0} models in team ${ctx.teamId}`);

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate name format
    if (!VALID_NAME_REGEX.test(name)) {
      return NextResponse.json({ error: "Name can only contain letters, numbers, -, _ and ." }, { status: 400 });
    }

    // Check if name already exists
    const existing = await getComboByName(name, ctx.teamId);
    if (existing) {
      return NextResponse.json({ error: "Combo name already exists" }, { status: 400 });
    }

    const combo = await createCombo({ teamId: ctx.teamId, name, models: models || [], kind: kind || null });

    await writeAuditLog({
      teamId: ctx.teamId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "create",
      resource: "combo",
      resourceId: combo.id,
      payload: { name, models: models?.length ?? 0 },
    }).catch(() => {});

    log.info("COMBO", `Created combo ${combo.id} (${name}) with ${models?.length || 0} models`);
    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: "Failed to create combo" }, { status: 500 });
  }
}
