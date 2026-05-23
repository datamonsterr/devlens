// Bun runtime adapter — uses built-in bun:sqlite (native, fastest under Bun).
// Loaded only when process.versions.bun is present.
import { AsyncLocalStorage } from "node:async_hooks";
import { PRAGMA_SQL } from "../schema.js";

const CHECKPOINT_INTERVAL_MS = 60 * 1000;

export async function createBunSqliteAdapter(filePath) {
  // Dynamic import — only resolves under Bun runtime
  const { Database } = await import("bun:sqlite");
  const db = new Database(filePath, { create: true });
  db.exec(PRAGMA_SQL);

  const stmtCache = new Map();
  function prepare(sql) {
    let stmt = stmtCache.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  const checkpointTimer = setInterval(() => {
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}
  }, CHECKPOINT_INTERVAL_MS);
  if (typeof checkpointTimer.unref === "function") checkpointTimer.unref();

  let queue = Promise.resolve();
  const txStorage = new AsyncLocalStorage();

  function serialize(operation) {
    if (txStorage.getStore()) return operation();
    const next = queue.then(operation, operation);
    queue = next.catch(() => {});
    return next;
  }

  function gracefulClose() {
    try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {}
    try { stmtCache.clear(); } catch {}
    try { db.close(); } catch {}
  }
  const onShutdown = () => gracefulClose();
  process.once("beforeExit", onShutdown);
  process.once("SIGINT", () => { onShutdown(); process.exit(0); });
  process.once("SIGTERM", () => { onShutdown(); process.exit(0); });

  return {
    driver: "bun:sqlite",
    run(sql, params = []) {
      return serialize(() => {
        const r = prepare(sql).run(...params);
        return { changes: Number(r.changes ?? 0), lastInsertRowid: Number(r.lastInsertRowid ?? 0) };
      });
    },
    get(sql, params = []) {
      return serialize(() => prepare(sql).get(...params));
    },
    all(sql, params = []) {
      return serialize(() => prepare(sql).all(...params));
    },
    exec(sql) { return serialize(() => db.exec(sql)); },
    transaction(fn) {
      return serialize(async () => {
        const sp = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        db.exec(`SAVEPOINT ${sp}`);
        try {
          const result = await txStorage.run(true, fn);
          db.exec(`RELEASE ${sp}`);
          return result;
        } catch (error) {
          try { db.exec(`ROLLBACK TO ${sp}`); db.exec(`RELEASE ${sp}`); } catch {}
          throw error;
        }
      });
    },
    checkpoint() { try { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); } catch {} },
    close() {
      clearInterval(checkpointTimer);
      gracefulClose();
    },
    raw: db,
  };
}
