import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { generateApiKey, hashApiKey } from "@/lib/apiKeyUtils";
import { v4 as uuidv4 } from "uuid";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();

    const adapter = await getAdapter();
    let keys;

    if (ctx.role === "manager") {
      keys = await adapter.all(
        `SELECT id, name, isActive, lastUsedAt, createdAt, userId FROM apiKeys WHERE teamId = ? ORDER BY createdAt DESC`,
        [ctx.teamId]
      );
    } else {
      keys = await adapter.all(
        `SELECT id, name, isActive, lastUsedAt, createdAt FROM apiKeys WHERE userId = ? ORDER BY createdAt DESC`,
        [ctx.userId]
      );
    }

    log.debug("KEYS", `Listed ${keys.length} keys for ${ctx.role} ${ctx.userId}`);
    return NextResponse.json({ keys: keys.map((k) => ({ ...k, isActive: k.isActive === 1 })) });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await requireTeamContext();

    if (ctx.role !== "developer") {
      log.warn("KEYS", `Non-developer ${ctx.role} attempted to create key`);
      return NextResponse.json({ error: "Only developers can create API keys" }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const adapter = await getAdapter();

    const settings = await adapter.get(
      `SELECT maxKeysPerDeveloper FROM teamSettings WHERE teamId = ?`,
      [ctx.teamId]
    );
    const maxKeys = settings?.maxKeysPerDeveloper || 5;

    const existing = await adapter.all(
      `SELECT COUNT(*) as count FROM apiKeys WHERE userId = ? AND isActive = 1`,
      [ctx.userId]
    );

    if (existing[0]?.count >= maxKeys) {
      log.warn("KEYS", `Key limit ${maxKeys} reached for user ${ctx.userId}`);
      return NextResponse.json({ error: `API key limit reached (max ${maxKeys})` }, { status: 400 });
    }

    const dup = await adapter.get(
      `SELECT id FROM apiKeys WHERE userId = ? AND name = ? AND isActive = 1`,
      [ctx.userId, name]
    );
    if (dup) {
      return NextResponse.json({ error: "Key name already exists" }, { status: 400 });
    }

    const keyValue = generateApiKey();
    const keyHash = hashApiKey(keyValue);
    const keyId = uuidv4();
    const now = new Date().toISOString();

    await adapter.run(
      `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
      [keyId, keyHash, name, ctx.teamId, ctx.userId, now]
    );

    log.info("KEYS", `Created key ${keyId} (${name}) masked=${log.maskKey(keyValue)} for user ${ctx.userId} team ${ctx.teamId}`);
    return NextResponse.json(
      { id: keyId, name, key: keyValue, createdAt: now },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
