import { getAdapter } from "@/lib/db/driver";
import { verifyApiKey } from "@/lib/apiKeyUtils";
import { NextResponse } from "next/server";

export async function authenticateApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Authorization required" }, { status: 401 }) };
  }

  const key = authHeader.slice(7);
  const adapter = await getAdapter();

  const apiKeys = await adapter.all(
    `SELECT id, keyHash, userId, teamId, isActive FROM apiKeys WHERE isActive = 1`
  );

  for (const ak of apiKeys) {
    if (ak.keyHash && verifyApiKey(key, ak.keyHash)) {
      // Legacy plain-text key support
      if (!ak.keyHash) continue;

      const user = await adapter.get(
        `SELECT id, clerkUserId, role FROM users WHERE id = ? AND isActive = 1`,
        [ak.userId]
      );

      if (!user) {
        return { error: NextResponse.json({ error: "User deactivated" }, { status: 401 }) };
      }

      // Update last used
      const now = new Date().toISOString();
      try {
        await adapter.run(`UPDATE apiKeys SET lastUsedAt = ? WHERE id = ?`, [now, ak.id]);
      } catch { /* non-critical */ }

      return {
        apiKeyId: ak.id,
        userId: ak.userId,
        teamId: ak.teamId,
        role: user.role,
      };
    }
  }

  return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
}
