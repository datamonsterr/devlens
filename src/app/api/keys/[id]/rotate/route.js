import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { generateApiKey, hashApiKey } from "@/lib/apiKeyUtils";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const ctx = await requireTeamContext();
    const { id } = await params;

    const adapter = await getAdapter();
    const existing = await adapter.get(
      `SELECT id, name, userId FROM apiKeys WHERE id = ? AND userId = ? AND isActive = 1`,
      [id, ctx.userId]
    );

    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const newKeyValue = generateApiKey();
    const newKeyHash = hashApiKey(newKeyValue);
    const newKeyId = uuidv4();
    const now = new Date().toISOString();

    await adapter.transaction(async () => {
      await adapter.run(`UPDATE apiKeys SET isActive = 0 WHERE id = ?`, [id]);
      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [newKeyId, newKeyHash, existing.name, ctx.teamId, ctx.userId, now]
      );
    });

    return NextResponse.json({ id: newKeyId, name: existing.name, key: newKeyValue });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
