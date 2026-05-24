import { ensureDirs, DATA_FILE } from "./paths.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;

async function tryLibsql() {
  if (!process.env.TURSO_DATABASE_URL) return null;
  try {
    const { createLibsqlAdapter } = await import("./adapters/libsqlAdapter.js");
    return await createLibsqlAdapter({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  } catch (e) {
    throw new Error(`[DB] libSQL unavailable while TURSO_DATABASE_URL is configured: ${e.message}`);
  }
}

async function tryBunSqlite() {
  // Bun runtime only — built-in, no install needed
  if (!process.versions.bun) return null;
  try {
    const { createBunSqliteAdapter } = await import("./adapters/bunSqliteAdapter.js");
    return await createBunSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] bun:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function tryBetterSqlite() {
  // Skip on Bun — better-sqlite3 native bindings unsupported
  if (process.versions.bun) return null;
  try {
    const { createBetterSqliteAdapter } = await import("./adapters/betterSqliteAdapter.js");
    return createBetterSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] better-sqlite3 unavailable: ${e.message}`);
    return null;
  }
}

async function tryNodeSqlite() {
  // Built-in since Node 22.5.0 — no install needed. Skip under Bun (no node:sqlite).
  if (process.versions.bun) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) return null;
  try {
    const { createNodeSqliteAdapter } = await import("./adapters/nodeSqliteAdapter.js");
    return await createNodeSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] node:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function trySqlJs() {
  try {
    const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
    return await createSqlJsAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] sql.js unavailable: ${e.message}`);
    return null;
  }
}

async function initAdapter() {
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) {
    throw new Error("[DB] TURSO_DATABASE_URL required on Vercel; local SQLite filesystem fallback disabled");
  }

  // Order per runtime:
  //   Turso: libSQL when TURSO_DATABASE_URL exists
  //   Bun:  bun:sqlite → sql.js
  //   Node: better-sqlite3 → node:sqlite (≥22.5) → sql.js
  let adapter = await tryLibsql();
  if (adapter) {
    if (!state.logged) {
      console.log(`[DB] Driver: libsql | location: ${process.env.TURSO_DATABASE_URL}`);
      state.logged = true;
    }
    const { runMigrationOnce } = await import("./migrate.js");
    try {
      await runMigrationOnce(adapter);
    } catch (error) {
      if (String(error?.message || "").includes("timed out waiting for Turso migration lock")) {
        console.warn("[DB][migrate] Turso migration lock busy; using existing schema");
      } else {
        throw error;
      }
    }
    return adapter;
  }
  ensureDirs();
  if (!adapter) adapter = await tryBunSqlite();
  if (!adapter) adapter = await tryBetterSqlite();
  if (!adapter) adapter = await tryNodeSqlite();
  if (!adapter) adapter = await trySqlJs();
  if (!adapter) throw new Error("[DB] No SQLite driver available (bun/better/node/sql.js all failed)");

  if (!state.logged) {
    const location = adapter.driver === "libsql" ? process.env.TURSO_DATABASE_URL : DATA_FILE;
    console.log(`[DB] Driver: ${adapter.driver} | location: ${location}`);
    state.logged = true;
  }

  const { runMigrationOnce } = await import("./migrate.js");
  await runMigrationOnce(adapter);
  return adapter;
}

export async function getAdapter() {
  if (state.instance) return state.instance;
  if (!state.initPromise) state.initPromise = initAdapter().then((a) => { state.instance = a; return a; });
  return state.initPromise;
}

export function getAdapterSync() {
  if (!state.instance) throw new Error("[DB] adapter not initialized — await getAdapter() first");
  return state.instance;
}
