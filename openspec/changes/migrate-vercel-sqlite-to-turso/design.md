## Context

Current Devlens DB code is built around local SQLite files:

- `src/lib/db/driver.js` selects Bun SQLite, `better-sqlite3`, `node:sqlite`, or `sql.js` and stores a singleton on `global._dbAdapter`
- `src/lib/db/paths.js` derives `${DATA_DIR}/db/data.sqlite`
- `src/lib/db/migrate.js` runs versioned migrations plus additive schema sync against the selected adapter
- adapters expose a sync shape: `run`, `get`, `all`, `exec`, `transaction`, `close`
- local adapters depend on a writable filesystem, WAL pragmas, checkpoint timers, and process signal handlers

Vercel production cannot rely on that model. Turso/libSQL should become the hosted production database while local SQLite remains useful for development and self-hosted installs.

The user supplied a Turso DB URL and token for setup. The token must be treated as a secret and must not be written into repo files. `.env.example` must contain placeholders only.

## Goals / Non-Goals

**Goals:**

- Add Turso/libSQL production support for Vercel deployments
- Keep local SQLite fallback for local development and self-hosted usage
- Add env-driven DB selection: Turso when `TURSO_DATABASE_URL` is configured, local SQLite otherwise
- Update `.env.example` with Turso placeholders and guidance
- Add scripts to initialize/update Turso schema and migrate existing local SQLite data into Turso
- Add README/instructions for database update workflow, including Vercel env setup
- Preserve current migration chain behavior across local SQLite and Turso
- Verify migration scripts can be run safely more than once or document non-idempotent steps clearly
- Update living specs for production DB architecture and migration workflow

**Non-Goals:**

- Do not commit real Turso tokens or DB auth secrets
- Do not remove local SQLite support in this change
- Do not change Clerk Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, or CLI Config Snippet semantics
- Do not redesign schema beyond changes required for Turso compatibility
- Do not migrate production data automatically during app startup
- Do not add a second production database type besides Turso/libSQL

## Decisions

### D1: Turso/libSQL is production DB for Vercel

**Rationale**: Vercel serverless has ephemeral filesystem behavior and concurrent invocations. Turso provides a durable remote SQLite-compatible database while matching Devlens' current SQLite direction.

**Alternatives considered**: Keep local SQLite on Vercel. Rejected because durability and concurrency are unsafe. Move to Postgres. Rejected because project docs and code are already SQLite-oriented and Turso provides smaller migration surface.

### D2: Env-driven runtime selection

**Rationale**: `TURSO_DATABASE_URL` presence should select libSQL. Without it, existing local SQLite chain remains available for local dev and self-hosting. This minimizes operator friction and keeps existing tests useful.

**Alternatives considered**: Require `DATABASE_DRIVER`. Rejected as extra config for the common case, though an optional override can be added if implementation needs it. Always use Turso. Rejected because local offline development should remain simple.

### D3: Do not write real Turso token to repo

**Rationale**: The provided token is a secret. It belongs in local `.env`, Vercel env vars, or secret manager, not `.env.example`, docs, tests, or committed scripts.

**Alternatives considered**: Put supplied token in `.env.example` for convenience. Rejected because `.env.example` is committed reference material.

### D4: Explicit operator migration scripts, not startup data migration

**Rationale**: Moving data from a local SQLite file to remote Turso is operationally sensitive and should be deliberate. App startup may run schema migrations, but data import/export must be manually invoked and verified.

**Alternatives considered**: Import local DB automatically when Turso env exists. Rejected because serverless instances may lack the local source DB and repeated startup imports risk duplicates.

### D5: Convert DB adapter, repositories, and API call sites to async

**Rationale**: `@libsql/client` is async while the current DB adapter contract is sync. Remote database IO must be awaited explicitly. The implementation will convert DB adapter methods, repository methods, and affected API routes to async instead of hiding remote calls behind sync wrappers.

**Alternatives considered**: Use child process or deasync wrappers. Rejected as brittle and unsuitable for Vercel. Split local sync and Turso async paths. Rejected because it creates long-term drift and doubles DB behavior to test.

### D6: Import scripts fail-fast by default on existing target data

**Rationale**: A rerun against a non-empty Turso database should stop before mutating data unless an explicit destructive or duplicate-handling mode is requested. Default fail-fast behavior protects the single production database from accidental duplicate rows or overwrites.

**Alternatives considered**: Skip existing rows. Rejected because partial migration drift can be hidden. Replace existing rows by default. Rejected because it is destructive. An explicit `--replace` flag may be added for intentional resets.

### D7: Use Turso-specific env names only

**Rationale**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` clearly communicate that the production database is Turso/libSQL and match operator expectations.

**Alternatives considered**: Generic `DATABASE_URL` and `DATABASE_AUTH_TOKEN`. Rejected as less explicit. Support both. Rejected for now because precedence rules add config ambiguity.

### D8: Local SQLite remains default for local development

**Rationale**: Developers should be able to run Devlens offline with no cloud credentials. Turso is opt-in locally by setting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

**Alternatives considered**: Turso default everywhere. Rejected because every local dev setup would need cloud DB credentials. Require explicit driver choice. Rejected as unnecessary setup friction.

### D9: App startup runs schema migrations only

**Rationale**: Schema migrations are safe to run on deploy when they are versioned/idempotent. Data import from local SQLite to Turso is operational and must remain a manual script workflow.

**Alternatives considered**: No startup migrations. Rejected because deploys could run against stale schema. Startup schema plus data import. Rejected because serverless instances may not have source DB and reruns risk data corruption.

### D10: One production Turso database for now

**Rationale**: The initial deployment will target one production Turso database. Migration scripts and docs must therefore include stronger safeguards: explicit target display, fail-fast default, dry-run/preflight, and confirmation for destructive operations.

**Alternatives considered**: Separate dev/staging/prod Turso databases. Recommended for safety but not chosen for this migration. Turso branch/replica flow. Deferred due to added operational complexity.

## Migration Plan

1. Add `@libsql/client` and a Turso/libSQL adapter.
2. Update DB initialization to select Turso when `TURSO_DATABASE_URL` exists.
3. Audit DB call sites and convert affected APIs/repos to async where needed.
4. Ensure schema migrations and additive sync work against libSQL.
5. Add scripts:
   - apply/update Turso schema
   - export current local SQLite data
   - import into Turso
   - verify row counts/basic integrity
6. Add operator README with local and Vercel steps.
7. Update `.env.example` with placeholders:
   - `TURSO_DATABASE_URL=libsql://...`
   - `TURSO_AUTH_TOKEN=change-me`
8. Add tests for driver selection and migration script behavior.

## Risks / Trade-offs

- **Risk**: Async conversion touches many API routes and repos → **Mitigation**: keep changes at DB boundary where possible, test representative Manager/Developer flows, and avoid unrelated refactors.
- **Risk**: SQLite pragmas unsupported or different on Turso → **Mitigation**: make pragma execution adapter-aware and tolerate unsupported WAL/busy-timeout statements on libSQL.
- **Risk**: Import creates duplicate rows → **Mitigation**: scripts should use explicit modes (`--dry-run`, `--replace`, or `--skip-existing`) and document expected behavior.
- **Risk**: Vercel route runtime mismatch → **Mitigation**: ensure routes using DB run in Node.js runtime if required by dependencies.
- **Risk**: Secret leakage → **Mitigation**: placeholders in committed files only; operator docs instruct setting real token in `.env.local`/Vercel env.
