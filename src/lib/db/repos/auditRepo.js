import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

export async function writeAuditLog({ teamId, actorId, actorRole, action, resource, resourceId, payload }) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO auditLog(teamId, actorId, actorRole, action, resource, resourceId, payload, createdAt)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      teamId,
      actorId,
      actorRole,
      action,
      resource,
      resourceId ?? null,
      payload ? stringifyJson(payload) : null,
      new Date().toISOString(),
    ]
  );
}

export async function getAuditLog(teamId, { limit = 50, offset = 0, resource } = {}) {
  const db = await getAdapter();
  const where = ["teamId = ?"];
  const params = [teamId];
  if (resource) { where.push("resource = ?"); params.push(resource); }
  params.push(limit, offset);
  const rows = await db.all(
    `SELECT id, actorId, actorRole, action, resource, resourceId, payload, createdAt
     FROM auditLog WHERE ${where.join(" AND ")}
     ORDER BY createdAt DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows.map((r) => ({
    ...r,
    payload: r.payload ? parseJson(r.payload, null) : null,
  }));
}
