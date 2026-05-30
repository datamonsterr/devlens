import { AsyncLocalStorage } from "node:async_hooks";
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

  const txStorage = new AsyncLocalStorage();

  async function execute(sql, params = []) {
    try {
      const activeTx = txStorage.getStore();
      if (activeTx) {
        return await activeTx.execute({ sql, args: params });
      }
      return await client.execute({ sql, args: params });
    } catch (err) {
      if (isIgnorablePragmaError(sql, err)) return { rows: [], rowsAffected: 0, lastInsertRowid: null };
      throw err;
    }
  }

  let queue = Promise.resolve();

  function serialize(operation) {
    if (txStorage.getStore()) return operation();
    const next = queue.then(operation, operation);
    queue = next.catch((err) => { if (err) console.debug("[DB] queue error swallowed:", err?.message); });
    return next;
  }

  async function execImmediate(sql) {
    for (const statement of splitStatements(sql)) await execute(statement);
  }

  function exec(sql) {
    return serialize(() => execImmediate(sql));
  }

  await exec(PRAGMA_SQL);

  return {
    driver: "libsql",
    async run(sql, params = []) { return serialize(async () => normalizeResult(await execute(sql, params))); },
    async get(sql, params = []) { return serialize(async () => normalizeRow((await execute(sql, params)).rows[0])); },
    async all(sql, params = []) { return serialize(async () => (await execute(sql, params)).rows.map(normalizeRow)); },
    exec,
    async transaction(fn) {
      return serialize(async () => {
        const tx = await client.transaction("write");
        try {
          const result = await txStorage.run(tx, fn);
          await tx.commit();
          return result;
        } catch (err) {
          try { await tx.rollback(); } catch {}
          throw err;
        }
      });
    },
    close() { client.close(); },
    raw: client,
  };
}
