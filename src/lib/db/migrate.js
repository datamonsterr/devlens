import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { LEGACY_FILES, DB_DIR, DATA_FILE } from "./paths.js";
import { TABLES, buildCreateTableSql } from "./schema.js";
import { MIGRATIONS, latestVersion } from "./migrations/index.js";
import { getMetaWithAdapter, setMetaWithAdapter } from "./helpers/metaStore.js";
import { makeBackupDir, backupFile, pruneOldBackups } from "./backup.js";
import { getAppVersion } from "./version.js";
import { stringifyJson } from "./helpers/jsonCol.js";

// Marker file: prevents re-importing legacy JSON when user wipes data.sqlite.
const MIGRATED_MARKER = path.join(DB_DIR, ".migrated-from-json");

// Track per-adapter so reusing same adapter skips re-run, but new adapter (after reset) re-runs.
const _migratedAdapters = new WeakSet();

const MIGRATION_LOCK_KEY = "schemaMigration";
const MIGRATION_LOCK_TTL_MS = 120000;
const MIGRATION_LOCK_REFRESH_MS = 30000;
const MIGRATION_LOCK_WAIT_MS = 30000;
const MIGRATION_LOCK_POLL_MS = 250;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function migrationLockOwner() {
  return `${process.pid}-${Date.now()}-${crypto.randomUUID()}`;
}

async function ensureMigrationLockTable(adapter) {
  await adapter.exec(`CREATE TABLE IF NOT EXISTS _migration_locks (
    key TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);
}

async function tryAcquireMigrationLock(adapter, owner, now = Date.now()) {
  const expiresAt = now + MIGRATION_LOCK_TTL_MS;
  const timestamp = new Date(now).toISOString();
  const result = await adapter.run(
    `INSERT INTO _migration_locks(key, owner, expiresAt, createdAt, updatedAt)
     VALUES(?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET owner = excluded.owner, expiresAt = excluded.expiresAt, updatedAt = excluded.updatedAt
     WHERE _migration_locks.expiresAt <= ? OR _migration_locks.owner = ?`,
    [MIGRATION_LOCK_KEY, owner, expiresAt, timestamp, timestamp, now, owner]
  );
  return result.changes > 0;
}

async function refreshMigrationLock(adapter, owner, now = Date.now()) {
  const expiresAt = now + MIGRATION_LOCK_TTL_MS;
  const timestamp = new Date(now).toISOString();
  const result = await adapter.run(
    `UPDATE _migration_locks SET expiresAt = ?, updatedAt = ? WHERE key = ? AND owner = ?`,
    [expiresAt, timestamp, MIGRATION_LOCK_KEY, owner]
  );
  return result.changes > 0;
}

async function releaseMigrationLock(adapter, owner) {
  await adapter.run(`DELETE FROM _migration_locks WHERE key = ? AND owner = ?`, [MIGRATION_LOCK_KEY, owner]);
}

async function withMigrationLock(adapter, fn) {
  if (adapter.driver !== "libsql") return fn();

  await ensureMigrationLockTable(adapter);
  const owner = migrationLockOwner();
  const deadline = Date.now() + MIGRATION_LOCK_WAIT_MS;

  while (!(await tryAcquireMigrationLock(adapter, owner))) {
    if (Date.now() >= deadline) throw new Error("[DB][migrate] timed out waiting for Turso migration lock");
    await sleep(MIGRATION_LOCK_POLL_MS);
  }

  let refreshFailure;
  const refreshTimer = setInterval(() => {
    refreshMigrationLock(adapter, owner).then((refreshed) => {
      if (!refreshed && !refreshFailure) refreshFailure = new Error("[DB][migrate] lost Turso migration lock");
    }).catch((err) => {
      if (!refreshFailure) refreshFailure = err;
    });
  }, MIGRATION_LOCK_REFRESH_MS);

  try {
    const result = await fn();
    if (refreshFailure) throw refreshFailure;
    return result;
  } finally {
    clearInterval(refreshTimer);
    try {
      await releaseMigrationLock(adapter, owner);
    } catch (err) {
      console.warn(`[DB][migrate] failed to release Turso migration lock: ${err.message}`);
    }
  }
}

// Thrown when row-count assertion fails. Outer transaction rolls back,
// legacy db.json kept intact, marker not written → next boot retries.
export class MigrationAborted extends Error {
  constructor(message, droppedRows) {
    super(message);
    this.name = "MigrationAborted";
    this.droppedRows = droppedRows;
  }
}

// Insert rows one-by-one, collect failures, then assert COUNT(*) matches input length.
async function importWithAssertion(adapter, tableName, rows, insertFn, rowMeta) {
  const dropped = [];
  for (const row of rows) {
    try { await insertFn(row); }
    catch (err) { dropped.push({ ...rowMeta(row), reason: err.message }); }
  }
  const inserted = (await adapter.get(`SELECT COUNT(*) as c FROM ${tableName}`))?.c ?? 0;
  if (inserted !== rows.length) {
    console.warn(`[DB][migrate] ${tableName} row-count mismatch: expected ${rows.length}, got ${inserted}. Dropped:`, dropped);
    throw new MigrationAborted(`${tableName} row-count mismatch: expected ${rows.length}, got ${inserted}`, dropped);
  }
}

function readJsonSafe(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); } catch { return null; }
}

async function isFreshDb(adapter) {
  // Table _meta may not exist yet on truly fresh DB
  try {
    const row = await adapter.get(`SELECT COUNT(*) as c FROM _meta`);
    return !row || row.c === 0;
  } catch {
    return true;
  }
}

// ─── Versioned migrations runner (skip-version safe) ─────────────────────
async function runVersionedMigrations(adapter) {
  // Bootstrap _meta first so we can read schemaVersion
  await adapter.exec(buildCreateTableSql("_meta", TABLES._meta));

  const current = parseInt(await getMetaWithAdapter(adapter, "schemaVersion", "0"), 10) || 0;
  const target = latestVersion();
  if (current >= target) return { applied: 0, from: current, to: current };

  const pending = MIGRATIONS.filter((m) => m.version > current);
  let lastApplied = current;
  for (const m of pending) {
    await adapter.transaction(async () => {
      await m.up(adapter);
      await setMetaWithAdapter(adapter, "schemaVersion", m.version);
    });
    lastApplied = m.version;
    console.log(`[DB][migrate] applied #${m.version} ${m.name}`);
  }
  return { applied: pending.length, from: current, to: lastApplied };
}

// ─── Auto-sync (additive only): add missing tables/columns/indexes ───────
async function syncSchemaFromTables(adapter) {
  for (const [tableName, def] of Object.entries(TABLES)) {
    // Create table if absent
    await adapter.exec(buildCreateTableSql(tableName, def));

    // Diff columns
    const existing = await adapter.all(`PRAGMA table_info(${tableName})`);
    const existingNames = new Set(existing.map((r) => r.name));
    for (const [colName, colDef] of Object.entries(def.columns)) {
      if (!existingNames.has(colName)) {
        // SQLite ADD COLUMN restrictions: no PRIMARY KEY / UNIQUE w/o NULL ok.
        // We strip PRIMARY KEY / UNIQUE since those are only valid at create time.
        const safeDef = colDef
          .replace(/PRIMARY KEY( AUTOINCREMENT)?/i, "")
          .replace(/UNIQUE/i, "")
          .trim();
        try {
          await adapter.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${safeDef}`);
          console.log(`[DB][sync] +column ${tableName}.${colName}`);
        } catch (e) {
          console.warn(`[DB][sync] add column ${tableName}.${colName} failed: ${e.message}`);
        }
      }
    }

    // Indexes (idempotent)
    for (const idx of def.indexes || []) {
      try { await adapter.exec(idx); } catch {}
    }
  }
}

// ─── Legacy JSON import (one-time) ───────────────────────────────────────
async function importLegacyMain(adapter, data) {
  if (!data || typeof data !== "object") return;

  if (data.settings) {
    await adapter.run(`INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`, [stringifyJson(data.settings)]);
  }

  await importWithAssertion(adapter, "providerConnections", data.providerConnections || [], async (c) => {
    const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, ...rest } = c;
    await adapter.run(
      `INSERT OR REPLACE INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, provider, authType || "oauth", name || null, email || null, priority || null, isActive === false ? 0 : 1, stringifyJson(rest), createdAt || new Date().toISOString(), updatedAt || new Date().toISOString()]
    );
  }, (c) => ({ id: c.id ?? null, provider: c.provider ?? null, name: c.name ?? null }));

  await importWithAssertion(adapter, "providerNodes", data.providerNodes || [], async (n) => {
    const { id, type, name, createdAt, updatedAt, ...rest } = n;
    await adapter.run(
      `INSERT OR REPLACE INTO providerNodes(id, type, name, data, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
      [id, type || null, name || null, stringifyJson(rest), createdAt || new Date().toISOString(), updatedAt || new Date().toISOString()]
    );
  }, (n) => ({ id: n.id ?? null, type: n.type ?? null, name: n.name ?? null }));

  await importWithAssertion(adapter, "apiKeys", data.apiKeys || [], async (k) => {
    await adapter.run(
      `INSERT OR REPLACE INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, ?)`,
      [k.id, k.key, k.name || null, k.machineId || null, k.isActive === false ? 0 : 1, k.createdAt || new Date().toISOString()]
    );
  }, (k) => ({ id: k.id ?? null, name: k.name ?? null }));

  await importWithAssertion(adapter, "combos", data.combos || [], async (c) => {
    await adapter.run(
      `INSERT OR REPLACE INTO combos(id, name, kind, models, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.kind || null, stringifyJson(c.models || []), c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()]
    );
  }, (c) => ({ id: c.id ?? null, name: c.name ?? null }));

  for (const [alias, model] of Object.entries(data.modelAliases || {})) {
    await adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('modelAliases', ?, ?)`, [alias, stringifyJson(model)]);
  }
  for (const m of data.customModels || []) {
    const k = `${m.providerAlias}|${m.id}|${m.type || "llm"}`;
    await adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [k, stringifyJson(m)]);
  }
  for (const [tool, mappings] of Object.entries(data.mitmAlias || {})) {
    await adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('mitmAlias', ?, ?)`, [tool, stringifyJson(mappings || {})]);
  }
  for (const [provider, models] of Object.entries(data.pricing || {})) {
    await adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('pricing', ?, ?)`, [provider, stringifyJson(models || {})]);
  }
}

async function importLegacyUsage(adapter, data) {
  if (!data || typeof data !== "object") return;
  for (const e of data.history || []) {
    const t = e.tokens || {};
    await adapter.run(
      `INSERT INTO usageHistory(timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, status, tokens, meta) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.timestamp || new Date().toISOString(),
        e.provider || null, e.model || null, e.connectionId || null, e.apiKey || null, e.endpoint || null,
        t.prompt_tokens || t.input_tokens || 0,
        t.completion_tokens || t.output_tokens || 0,
        e.cost || 0,
        e.status || "ok",
        stringifyJson(t),
        stringifyJson({}),
      ]
    );
  }
  for (const [dateKey, day] of Object.entries(data.dailySummary || {})) {
    await adapter.run(`INSERT OR REPLACE INTO usageDaily(dateKey, data) VALUES(?, ?)`, [dateKey, stringifyJson(day)]);
  }
  if (typeof data.totalRequestsLifetime === "number") {
    await setMetaWithAdapter(adapter, "totalRequestsLifetime", data.totalRequestsLifetime);
  }
}

async function importLegacyDisabled(adapter, data) {
  if (!data || typeof data.disabled !== "object") return;
  for (const [provider, ids] of Object.entries(data.disabled)) {
    await adapter.run(`INSERT OR REPLACE INTO kv(scope, key, value) VALUES('disabledModels', ?, ?)`, [provider, stringifyJson(ids || [])]);
  }
}

async function importLegacyDetails(adapter, data) {
  if (!data || !Array.isArray(data.records)) return;
  for (const r of data.records) {
    await adapter.run(
      `INSERT OR REPLACE INTO requestDetails(id, timestamp, provider, model, connectionId, status, data) VALUES(?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.timestamp || new Date().toISOString(), r.provider || null, r.model || null, r.connectionId || null, r.status || null, stringifyJson(r)]
    );
  }
}

// ─── Main entry ──────────────────────────────────────────────────────────
export async function runMigrationOnce(adapter) {
  if (_migratedAdapters.has(adapter)) return;
  let migrated = false;

  await withMigrationLock(adapter, async () => {
    // Capture freshness BEFORE migrations stamp _meta (otherwise we'd misclassify
    // a brand-new DB as non-fresh once schemaVersion is written).
    const fresh = await isFreshDb(adapter);

    // 1. Always run versioned migrations chain (skip-version safe)
    const migInfo = await runVersionedMigrations(adapter);

    // 2. Additive sync (auto add missing columns/indexes declared in TABLES)
    await syncSchemaFromTables(adapter);

    // 3. One-time legacy JSON import (only if DB was fresh on entry)
    const alreadyImported = fs.existsSync(MIGRATED_MARKER);
    const legacyMain = readJsonSafe(LEGACY_FILES.main);
    const legacyUsage = readJsonSafe(LEGACY_FILES.usage);
    const legacyDisabled = readJsonSafe(LEGACY_FILES.disabled);
    const legacyDetails = readJsonSafe(LEGACY_FILES.details);
    const hasLegacy = !!(legacyMain || legacyUsage || legacyDisabled || legacyDetails);

    if (fresh && hasLegacy && !alreadyImported) {
      const t0 = Date.now();
      const backupDir = makeBackupDir("migrate-from-json");
      for (const f of Object.values(LEGACY_FILES)) backupFile(f, backupDir);

      try {
        await adapter.transaction(async () => {
          await importLegacyMain(adapter, legacyMain);
          await importLegacyUsage(adapter, legacyUsage);
          await importLegacyDisabled(adapter, legacyDisabled);
          await importLegacyDetails(adapter, legacyDetails);
          await setMetaWithAdapter(adapter, "appVersion", getAppVersion());
          await setMetaWithAdapter(adapter, "migratedAt", new Date().toISOString());
        });
      } catch (err) {
        if (err instanceof MigrationAborted) {
          console.error(`[DB][migrate] aborted: ${err.message} | legacy JSON kept | backup: ${backupDir}`);
          return;
        }
        throw err;
      }

      try { fs.writeFileSync(MIGRATED_MARKER, new Date().toISOString()); } catch {}
      pruneOldBackups();
      console.log(`[DB][migrate] JSON → SQLite in ${Date.now() - t0}ms | legacy JSON kept at DATA_DIR | backup: ${backupDir}`);
      migrated = true;
      return;
    }

    if (fresh) {
      await setMetaWithAdapter(adapter, "appVersion", getAppVersion());
      migrated = true;
      return;
    }

    // 4. App version bump → backup data.sqlite (safety net before user-side upgrade)
    const oldVer = await getMetaWithAdapter(adapter, "appVersion", null);
    const newVer = getAppVersion();
    if (oldVer && oldVer !== newVer) {
      const backupDir = makeBackupDir(`upgrade-${oldVer}-to-${newVer}`);
      try { backupFile(DATA_FILE, backupDir); } catch {}
      await setMetaWithAdapter(adapter, "appVersion", newVer);
      pruneOldBackups();
      console.log(`[DB][migrate] App ${oldVer} → ${newVer} | schema ${migInfo.from} → ${migInfo.to} | backup: ${backupDir}`);
    } else if (migInfo.applied > 0) {
      // Schema upgrade without app version bump — still backup
      const backupDir = makeBackupDir(`schema-${migInfo.from}-to-${migInfo.to}`);
      try { backupFile(DATA_FILE, backupDir); } catch {}
      pruneOldBackups();
    }
    migrated = true;
  });

  if (migrated) _migratedAdapters.add(adapter);
}

export const __migrationLockTest = {
  MIGRATION_LOCK_KEY,
  MIGRATION_LOCK_TTL_MS,
  MIGRATION_LOCK_REFRESH_MS,
  MIGRATION_LOCK_WAIT_MS,
  MIGRATION_LOCK_POLL_MS,
  ensureMigrationLockTable,
  tryAcquireMigrationLock,
  refreshMigrationLock,
  releaseMigrationLock,
  withMigrationLock,
};
