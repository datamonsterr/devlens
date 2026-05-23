import { AsyncLocalStorage } from "node:async_hooks";
import Database from "better-sqlite3";
import { PRAGMA_SQL } from "../schema.js";

// Periodic checkpoint to keep WAL file small (avoid huge -wal/-shm growth)
const CHECKPOINT_INTERVAL_MS = 60 * 1000;

export function createBetterSqliteAdapter(filePath) {
  const db = new Database(filePath);
  db.exec(PRAGMA_SQL);
  // Schema is created/synced by migrate.js after adapter init

  const stmtCache = new Map();

  function prepare(sql) {
    let stmt = stmtCache.get(sql);
    if (!stmt) {
      stmt = db.prepare(sql);
      stmtCache.set(sql, stmt);
    }
    return stmt;
  }

  // Truncate WAL periodically so file stays small for backup/copy
  const checkpointTimer = setInterval(() => {
    try { db.pragma("wal_checkpoint(TRUNCATE)"); } catch {}
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
    try { db.pragma("wal_checkpoint(TRUNCATE)"); } catch {}
    try { stmtCache.clear(); } catch {}
    try { db.close(); } catch {}
  }

  // Ensure WAL is flushed and -wal/-shm files removed on shutdown
  const onShutdown = () => gracefulClose();
  process.once("beforeExit", onShutdown);
  process.once("SIGINT", () => { onShutdown(); process.exit(0); });
  process.once("SIGTERM", () => { onShutdown(); process.exit(0); });

  return {
    driver: "better-sqlite3",
    run(sql, params = []) { return serialize(() => prepare(sql).run(params)); },
    get(sql, params = []) { return serialize(() => prepare(sql).get(params)); },
    all(sql, params = []) { return serialize(() => prepare(sql).all(params)); },
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
    checkpoint() { try { db.pragma("wal_checkpoint(TRUNCATE)"); } catch {} },
    close() {
      clearInterval(checkpointTimer);
      gracefulClose();
    },
    raw: db,
  };
}
