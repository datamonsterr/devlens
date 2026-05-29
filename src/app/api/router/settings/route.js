import { NextResponse } from "next/server";
import { requireManagerContext, requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { writeAuditLog } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_FALLBACK_BEHAVIORS = ["next_on_error", "next_on_429", "always_try_all"];
const VALID_COMBO_STRATEGIES = ["fallback", "round_robin", "sticky_round_robin"];

async function getRouterSettings(adapter, teamId) {
  const row = await adapter.get(
    `SELECT data FROM teamSettings WHERE teamId = ?`,
    [teamId]
  );
  const raw = row ? JSON.parse(row.data || "{}") : {};
  return {
    fallbackBehavior: raw.fallbackBehavior || "next_on_error",
    comboStrategy: raw.comboStrategy || "fallback",
    cooldownSeconds: typeof raw.cooldownSeconds === "number" ? raw.cooldownSeconds : 60,
    ...raw,
  };
}

export async function GET() {
  try {
    const ctx = await requireTeamContext();
    const adapter = await getAdapter();
    const settings = await getRouterSettings(adapter, ctx.teamId);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to fetch router settings" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const ctx = await requireManagerContext();
    const body = await request.json();
    const { fallbackBehavior, comboStrategy, cooldownSeconds } = body;

    if (fallbackBehavior && !VALID_FALLBACK_BEHAVIORS.includes(fallbackBehavior)) {
      return NextResponse.json({ error: `fallbackBehavior must be one of: ${VALID_FALLBACK_BEHAVIORS.join(", ")}` }, { status: 400 });
    }
    if (comboStrategy && !VALID_COMBO_STRATEGIES.includes(comboStrategy)) {
      return NextResponse.json({ error: `comboStrategy must be one of: ${VALID_COMBO_STRATEGIES.join(", ")}` }, { status: 400 });
    }
    if (cooldownSeconds !== undefined && (typeof cooldownSeconds !== "number" || cooldownSeconds < 0)) {
      return NextResponse.json({ error: "cooldownSeconds must be a non-negative number" }, { status: 400 });
    }

    const adapter = await getAdapter();
    let updated;
    await adapter.transaction(async () => {
      const row = await adapter.get(`SELECT data FROM teamSettings WHERE teamId = ?`, [ctx.teamId]);
      const current = row ? JSON.parse(row.data || "{}") : {};
      const next = { ...current };
      if (fallbackBehavior !== undefined) next.fallbackBehavior = fallbackBehavior;
      if (comboStrategy !== undefined) next.comboStrategy = comboStrategy;
      if (cooldownSeconds !== undefined) next.cooldownSeconds = cooldownSeconds;
      const maxKeys = row?.maxKeysPerDeveloper ?? 5;
      await adapter.run(
        `INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, ?, ?)
         ON CONFLICT(teamId) DO UPDATE SET data = excluded.data`,
        [ctx.teamId, maxKeys, JSON.stringify(next)]
      );
      updated = next;
    });

    await writeAuditLog({
      teamId: ctx.teamId,
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: "update",
      resource: "routerSettings",
      payload: { fallbackBehavior, comboStrategy, cooldownSeconds },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to update router settings" }, { status: 500 });
  }
}
