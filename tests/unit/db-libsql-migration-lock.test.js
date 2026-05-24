import { describe, it, expect, vi, afterEach } from "vitest";

function makeLockStore() {
  const locks = new Map();
  return {
    locks,
    insert(sql, params) {
      if (sql.startsWith("INSERT INTO _migration_locks")) {
        const [key, owner, expiresAt, createdAt, updatedAt, now, allowedOwner] = params;
        const current = this.locks.get(key);
        if (!current || current.expiresAt <= now || current.owner === allowedOwner) {
          this.locks.set(key, { owner, expiresAt, createdAt: current?.createdAt ?? createdAt, updatedAt });
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      return { changes: 0 };
    },
    update(sql, params) {
      if (sql.startsWith("UPDATE _migration_locks")) {
        const [expiresAt, updatedAt, key, owner] = params;
        const current = this.locks.get(key);
        if (current?.owner !== owner) return { changes: 0 };
        this.locks.set(key, { ...current, expiresAt, updatedAt });
        return { changes: 1 };
      }
      return { changes: 0 };
    },
    delete(sql, params) {
      if (sql.startsWith("DELETE FROM _migration_locks")) {
        const [key, owner] = params;
        const current = this.locks.get(key);
        if (current?.owner === owner) {
          this.locks.delete(key);
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      return { changes: 0 };
    },
    dispatch(sql, params) {
      if (sql.startsWith("INSERT INTO _migration_locks")) return this.insert(sql, params);
      if (sql.startsWith("UPDATE _migration_locks")) return this.update(sql, params);
      if (sql.startsWith("DELETE FROM _migration_locks")) return this.delete(sql, params);
      return { changes: 0 };
    },
  };
}

function createLockAdapter() {
  const store = makeLockStore();
  const adapter = {
    driver: "libsql",
    exec: vi.fn(async () => {}),
    run: vi.fn(async (sql, params) => store.dispatch(sql, params)),
  };
  return adapter;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("libsql migration lock", () => {
  it("waits for release before second runner acquires", async () => {
    const { __migrationLockTest } = await import("../../src/lib/db/migrate.js");
    const adapter = createLockAdapter();

    await __migrationLockTest.ensureMigrationLockTable(adapter);
    expect(await __migrationLockTest.tryAcquireMigrationLock(adapter, "first", 1000)).toBe(true);
    expect(await __migrationLockTest.tryAcquireMigrationLock(adapter, "second", 2000)).toBe(false);

    await __migrationLockTest.releaseMigrationLock(adapter, "first");
    expect(await __migrationLockTest.tryAcquireMigrationLock(adapter, "second", 3000)).toBe(true);
  });

  it("refreshes lease so stale contenders cannot steal long migration lock", async () => {
    const { __migrationLockTest } = await import("../../src/lib/db/migrate.js");
    const adapter = createLockAdapter();

    expect(await __migrationLockTest.tryAcquireMigrationLock(adapter, "first", 1000)).toBe(true);
    expect(await __migrationLockTest.refreshMigrationLock(adapter, "first", 121000)).toBe(true);
    expect(await __migrationLockTest.tryAcquireMigrationLock(adapter, "second", 122000)).toBe(false);
  });

  it("keeps original migration error when release fails", async () => {
    const { __migrationLockTest } = await import("../../src/lib/db/migrate.js");
    const adapter = createLockAdapter();
    const original = new Error("migration failed");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    adapter.run.mockImplementation(async (sql, params) => {
      if (sql.startsWith("DELETE FROM _migration_locks")) throw new Error("release failed");
      return createLockAdapter().run(sql, params);
    });

    await expect(__migrationLockTest.withMigrationLock(adapter, async () => { throw original; })).rejects.toThrow("migration failed");
  });

  it("times out without marking adapter migrated, then retries after release", async () => {
    vi.useFakeTimers();
    const { runMigrationOnce } = await import("../../src/lib/db/migrate.js");
    const adapter = createLockAdapter();

    adapter.exec.mockImplementation(async (sql) => {
      if (sql.startsWith("CREATE TABLE IF NOT EXISTS _migration_locks")) return {};
      return null;
    });

    await adapter.run(
      `INSERT INTO _migration_locks(key, owner, expiresAt, createdAt, updatedAt)
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET owner = excluded.owner, expiresAt = excluded.expiresAt, updatedAt = excluded.updatedAt
       WHERE _migration_locks.expiresAt <= ? OR _migration_locks.owner = ?`,
      ["schemaMigration", "holder", Date.now() + 120000, new Date().toISOString(), new Date().toISOString(), Date.now(), "holder"]
    );

    const first = runMigrationOnce(adapter);
    const firstExpectation = expect(first).rejects.toThrow("timed out waiting for Turso migration lock");
    await vi.advanceTimersByTimeAsync(31000);
    await firstExpectation;

    await adapter.run(`DELETE FROM _migration_locks WHERE key = ? AND owner = ?`, ["schemaMigration", "holder"]);
    adapter.get = vi.fn(async () => ({ c: 0 }));
    adapter.all = vi.fn(async () => []);
    adapter.transaction = vi.fn(async (fn) => fn());

    const second = runMigrationOnce(adapter);
    await vi.runOnlyPendingTimersAsync();
    await expect(second).resolves.toBeUndefined();
    expect(adapter.exec).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS _meta"));
  });
});
