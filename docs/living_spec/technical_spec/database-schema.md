# Database schema

Devlens persistence targets SQLite semantics across local SQLite and Turso/libSQL.

## Production

Vercel production uses Turso/libSQL as durable database when `TURSO_DATABASE_URL` is configured:

- `TURSO_DATABASE_URL=libsql://your-db.turso.io`
- `TURSO_AUTH_TOKEN=change-me`

Production Team data, Provider Connections, API Keys, Combos, Model Aliases, Pricing Overrides, RTK Pool state, usage, and request logs persist in Turso across serverless invocations. Vercel deployments must not depend on local `DATA_DIR` SQLite files for production state.

Real tokens live in local `.env`/`.env.local`, Vercel env vars, or secret manager, never committed.

## Runtime selection

Database adapter selection is env-driven:

- `TURSO_DATABASE_URL` present → libSQL adapter using `TURSO_AUTH_TOKEN` when required.
- `TURSO_DATABASE_URL` absent → local SQLite fallback chain under `DATA_DIR`, currently `${DATA_DIR}/db/data.sqlite`.

Local SQLite supports development and self-hosted deployments. Turso mode avoids writable local SQLite files, WAL checkpoint timers, and local DB signal-handler assumptions.

## Schema operations

Current schema is declared in `src/lib/db/schema.js` and versioned migrations live in `src/lib/db/migrations/`. Migrations and additive schema sync run against both local SQLite and Turso/libSQL. Schema version order remains monotonic.

Startup may apply schema migrations, but only schema migrations. Data migration from local SQLite to Turso is never automatic at app startup.

## Turso migration coordination

Vercel cold starts can happen concurrently against one Turso database, so Turso schema migration startup coordinates with a Turso-backed migration lock:

- lock lives in `_migration_locks` and includes owner plus expiry fields;
- one runner applies pending migrations;
- concurrent runners wait for the lock and then re-check schema version through the normal migration path;
- abandoned locks expire so later starts can proceed;
- lock wait timeout fails safely before serving DB-dependent requests;
- migration version update is guarded with migration step execution where libSQL supports it.

Unsupported SQLite pragmas must be ignored or handled in Turso mode without failing schema initialization.

## SQLite to Turso migration

Data migration is explicit operator workflow, not automatic startup behavior:

1. Preflight env/source: `npm run turso:preflight -- --dry-run`
2. Apply Turso schema.
3. Export local SQLite rows to JSON.
4. Import export into Turso.
5. Verify table row counts.

Import is fail-fast by default: non-empty target tables abort before inserts or overwrites. Use `--replace` only for intentional destructive reset after confirming target URL and backup. Full runbook: `docs/sqlite-to-turso.md`.
