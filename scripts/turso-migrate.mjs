#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TABLES, buildCreateTableSql } from "../src/lib/db/schema.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_EXPORT = path.join(ROOT, "tmp", "sqlite-export.json");
const DATA_DIR = process.env.DATA_DIR || path.join(process.env.HOME || ROOT, ".devlens");
const DEFAULT_SQLITE = path.join(DATA_DIR, "db", "data.sqlite");
const TABLE_NAMES = Object.keys(TABLES).filter((name) => name !== "sqlite_sequence");

function usage() {
  console.log(`Usage: node scripts/turso-migrate.mjs <command> [flags]

Commands:
  schema-apply       Apply current Devlens schema to Turso
  export-sqlite      Export local SQLite rows to JSON
  import-turso       Import exported rows into Turso; fails if target tables contain rows
  verify             Compare export row counts with Turso row counts
  preflight          Validate local export source and Turso env/connection

Flags:
  --dry-run          Print planned work, validate inputs, make no changes
  --sqlite-file PATH Source SQLite file; default DATA_DIR/db/data.sqlite
  --export-file PATH Export JSON file; default tmp/sqlite-export.json
  --replace          Delete target table rows before import when target is non-empty
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, dryRun: false, sqliteFile: DEFAULT_SQLITE, exportFile: DEFAULT_EXPORT, replace: false };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--replace") args.replace = true;
    else if (arg === "--sqlite-file") args.sqliteFile = path.resolve(rest[++i]);
    else if (arg === "--export-file") args.exportFile = path.resolve(rest[++i]);
    else throw new Error(`Unknown flag: ${arg}`);
  }
  return args;
}

async function loadLibsql() {
  try { return await import("@libsql/client"); }
  catch { throw new Error("Missing @libsql/client. Run `npm install @libsql/client` before Turso commands."); }
}

async function loadBetterSqlite() {
  try { return (await import("better-sqlite3")).default; }
  catch { throw new Error("Missing better-sqlite3. Run `npm install` before local SQLite export."); }
}

function requireTursoEnv() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken || authToken === "change-me") throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in env before Turso commands.");
  return { url, authToken };
}

async function connectTurso() {
  const { createClient } = await loadLibsql();
  const env = requireTursoEnv();
  return createClient(env);
}

function tableSql() {
  return TABLE_NAMES.flatMap((name) => [buildCreateTableSql(name, TABLES[name]), ...(TABLES[name].indexes || [])]);
}

async function schemaApply(args) {
  console.log(`target=${process.env.TURSO_DATABASE_URL || "unset"}`);
  const sql = tableSql();
  if (args.dryRun) return console.log(`dry-run: would execute ${sql.length} schema statements`);
  const db = await connectTurso();
  for (const statement of sql) await db.execute(statement);
  console.log(`schema applied: ${sql.length} statements`);
}

async function exportSqlite(args) {
  if (!fs.existsSync(args.sqliteFile)) throw new Error(`SQLite file not found: ${args.sqliteFile}`);
  const Database = await loadBetterSqlite();
  const db = new Database(args.sqliteFile, { readonly: true, fileMustExist: true });
  const tables = {};
  const counts = {};
  for (const name of TABLE_NAMES) {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
    const rows = exists ? db.prepare(`SELECT * FROM ${name}`).all() : [];
    tables[name] = rows;
    counts[name] = rows.length;
  }
  db.close();
  const out = { exportedAt: new Date().toISOString(), sqliteFile: args.sqliteFile, counts, tables };
  if (args.dryRun) return console.log(JSON.stringify({ sqliteFile: args.sqliteFile, counts }, null, 2));
  fs.mkdirSync(path.dirname(args.exportFile), { recursive: true });
  fs.writeFileSync(args.exportFile, JSON.stringify(out, null, 2));
  console.log(`exported: ${args.exportFile}`);
}

function readExport(file) {
  if (!fs.existsSync(file)) throw new Error(`Export file not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function targetCounts(db) {
  const counts = {};
  for (const name of TABLE_NAMES) {
    try { counts[name] = Number((await db.execute(`SELECT COUNT(*) AS c FROM ${name}`)).rows[0]?.c || 0); }
    catch { counts[name] = null; }
  }
  return counts;
}

async function importTurso(args) {
  const data = readExport(args.exportFile);
  console.log(`target=${process.env.TURSO_DATABASE_URL || "unset"}`);
  const db = await connectTurso();
  await schemaApply({ ...args, dryRun: false });
  const before = await targetCounts(db);
  const nonEmpty = Object.entries(before).filter(([, count]) => count && count > 0);
  if (nonEmpty.length && !args.replace) throw new Error(`Target not empty: ${nonEmpty.map(([n, c]) => `${n}=${c}`).join(", ")}. Use --replace only after confirming target URL and backup.`);
  const rows = Object.entries(data.tables || {}).reduce((sum, [, tableRows]) => sum + tableRows.length, 0);
  if (args.dryRun) return console.log(`dry-run: would import ${rows} rows from ${args.exportFile}${args.replace ? " after deleting target rows" : ""}`);
  if (nonEmpty.length && args.replace) {
    for (const name of [...TABLE_NAMES].reverse()) await db.execute(`DELETE FROM ${name}`);
  }
  for (const name of TABLE_NAMES) {
    for (const row of data.tables[name] || []) {
      const cols = Object.keys(row);
      if (!cols.length) continue;
      const placeholders = cols.map(() => "?").join(", ");
      await db.execute({ sql: `INSERT INTO ${name} (${cols.join(", ")}) VALUES (${placeholders})`, args: cols.map((col) => row[col]) });
    }
  }
  console.log(`imported: ${rows} rows`);
}

async function verify(args) {
  const data = readExport(args.exportFile);
  const db = await connectTurso();
  const actual = await targetCounts(db);
  const mismatches = [];
  for (const name of TABLE_NAMES) {
    const expected = data.counts?.[name] || 0;
    if (actual[name] !== expected) mismatches.push(`${name}: expected ${expected}, got ${actual[name]}`);
  }
  if (mismatches.length) throw new Error(`row count mismatch\n${mismatches.join("\n")}`);
  console.log("verified: row counts match");
}

async function preflight(args) {
  console.log(`sqlite=${args.sqliteFile}`);
  console.log(`export=${args.exportFile}`);
  console.log(`target=${process.env.TURSO_DATABASE_URL || "unset"}`);
  if (fs.existsSync(args.sqliteFile)) await exportSqlite({ ...args, dryRun: true });
  if (process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) {
    const db = await connectTurso();
    await db.execute("SELECT 1");
    console.log("turso connection: ok");
  }
}

const commands = { "schema-apply": schemaApply, "export-sqlite": exportSqlite, "import-turso": importTurso, verify, preflight };

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === "help" || args.command === "--help") { usage(); process.exit(0); }
  if (!commands[args.command]) throw new Error(`Unknown command: ${args.command}`);
  await commands[args.command](args);
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exit(1);
}
