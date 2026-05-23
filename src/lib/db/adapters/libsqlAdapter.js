import { createClient } from "@libsql/client";
import { PRAGMA_SQL } from "../schema.js";

function splitStatements(sql) {
  return String(sql)
    .split(/;\s*(?:\n|$)/)
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

function normalizeResult(result) {
  return {
    changes: Number(result.rowsAffected ?? 0),
    lastInsertRowid: result.lastInsertRowid ?? null,
  };
}

function normalizeRow(row) {
  if (!row) return undefined;
  return Object.fromEntries(Object.entries(row));
}

function isIgnorablePragmaError(sql, err) {
  return /^\s*PRAGMA\s+/i.test(sql) && /unsupported|not supported|syntax|pragma/i.test(err?.message || "");
}

export async function createLibsqlAdapter({ url, authToken }) {
  const client = createClient({ url, authToken });

  async function execute(sql, params = []) {
    try {
      return await client.execute({ sql, args: params });
    } catch (err) {
      if (isIgnorablePragmaError(sql, err)) return { rows: [], rowsAffected: 0, lastInsertRowid: null };
      throw err;
    }
  }

  async function exec(sql) {
    for (const statement of splitStatements(sql)) await execute(statement);
  }

  await exec(PRAGMA_SQL);

  return {
    driver: "libsql",
    async run(sql, params = []) { return normalizeResult(await execute(sql, params)); },
    async get(sql, params = []) { return normalizeRow((await execute(sql, params)).rows[0]); },
    async all(sql, params = []) { return (await execute(sql, params)).rows.map(normalizeRow); },
    exec,
    async transaction(fn) {
      await execute("BEGIN");
      try {
        const result = await fn();
        await execute("COMMIT");
        return result;
      } catch (err) {
        try { await execute("ROLLBACK"); } catch {}
        throw err;
      }
    },
    close() { client.close(); },
    raw: client,
  };
}
