import { getAdapter } from "@/lib/db/driver";
import { verifyApiKey } from "@/lib/apiKeyUtils";
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function authenticateApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    log.warn("AUTH", "Missing or malformed Authorization header");
    return { error: NextResponse.json({ error: "Authorization required" }, { status: 401 }) };
  }

  const key = authHeader.slice(7);
  const masked = log.maskKey(key);
  log.debug("AUTH", `Attempting auth with key ${masked}`);
  const adapter = await getAdapter();

  const apiKeys = await adapter.all(
    `SELECT id, keyHash, userId, teamId, isActive FROM apiKeys WHERE isActive = 1`
  );

  log.debug("AUTH", `Loaded ${apiKeys.length} active keys`);

  for (const ak of apiKeys) {
    if (ak.keyHash && verifyApiKey(key, ak.keyHash)) {
      const user = await adapter.get(
        `SELECT id, clerkUserId, role FROM users WHERE id = ? AND isActive = 1`,
        [ak.userId]
      );

      if (!user) {
        log.warn("AUTH", `Key matched but user ${ak.userId} deactivated`);
        return { error: NextResponse.json({ error: "User deactivated" }, { status: 401 }) };
      }

      const now = new Date().toISOString();
      try {
        await adapter.run(`UPDATE apiKeys SET lastUsedAt = ? WHERE id = ?`, [now, ak.id]);
      } catch { /* non-critical */ }

      log.info("AUTH", `Authenticated key=${masked} team=${ak.teamId} user=${ak.userId} role=${user.role}`);
      return {
        apiKeyId: ak.id,
        userId: ak.userId,
        teamId: ak.teamId,
        role: user.role,
      };
    }
  }

  log.warn("AUTH", `Invalid API key ${masked} (no matching hash)`);
  return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };
}
