# Database schema

Devlens persistence targets SQLite semantics.

## Production

Vercel production uses Turso/libSQL with env-provided credentials:

- `TURSO_DATABASE_URL=libsql://your-db.turso.io`
- `TURSO_AUTH_TOKEN=change-me`

Real tokens live in local `.env`/`.env.local` or Vercel env vars, never committed.

## Local fallback

When Turso env is absent, Devlens uses local SQLite under `DATA_DIR`, currently `${DATA_DIR}/db/data.sqlite`. This supports development and self-hosted deployments.

## Schema operations

Current schema is declared in `src/lib/db/schema.js` and versioned migrations live in `src/lib/db/migrations/`. Operators apply/update Turso schema with:

```sh
npm run turso:schema -- --dry-run
npm run turso:schema
```

## SQLite to Turso migration

Operator workflow:

1. Preflight env/source: `npm run turso:preflight -- --dry-run`
2. Apply Turso schema.
3. Export local SQLite rows to JSON.
4. Import export into Turso.
5. Verify table row counts.

Import is fail-fast by default: non-empty target tables abort unless `--allow-non-empty` is explicitly supplied after manual review. Full runbook: `docs/sqlite-to-turso.md`.
