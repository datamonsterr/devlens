## Why

Devlens targets Vercel deployment, but the current database layer depends on a writable local SQLite file under `DATA_DIR`, long-lived process state, WAL checkpoint timers, and sync adapters. Vercel serverless instances have ephemeral filesystems and concurrent execution, so local SQLite cannot be the production database. Turso/libSQL gives Devlens a managed SQLite-compatible database that works from Vercel while preserving SQLite semantics and migration direction.

Managers and Developers need the deployed app to share durable Team data, Provider Connections, API Keys, Combos, Model Aliases, Pricing Overrides, RTK Pool state, usage, and request logs across serverless invocations.

## What Changes

- Add Turso/libSQL support as the production DB target for Vercel using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Keep local SQLite support for development/self-hosted installs, selected by env configuration
- Add a libSQL adapter and update DB initialization so Vercel uses Turso instead of local `DATA_DIR` storage
- Add migration/export/import scripts needed to move an existing local SQLite DB into Turso
- Add operational instructions for creating, validating, and updating the Turso database
- Update `.env.example` with Turso URL/token placeholders and Vercel production guidance without committing real credentials
- Update DB docs/living specs for hosted Turso production, local SQLite dev fallback, and migration workflow
- Make app database access safe for remote async libSQL where needed
- Rename app port references to the `2026x` range where this change touches runtime docs/config

## Capabilities

### New Capabilities

- `turso-production-database`: Deploy Devlens on Vercel against a Turso/libSQL database using env-provided remote DB URL and auth token.
- `sqlite-to-turso-migration`: Export existing local SQLite data and import it into Turso with repeatable scripts and verification steps.
- `database-runtime-selection`: Select Turso for production when `TURSO_DATABASE_URL` is present and keep local SQLite for development/self-hosted usage.

### Modified Capabilities

- `database-schema`: Schema/migrations must run against both local SQLite and Turso/libSQL.
- `vercel-runtime`: Vercel deployments must not depend on persistent local `DATA_DIR` database files.

## Impact

- **Dependencies**: Add `@libsql/client`; keep existing SQLite dependencies for local fallback.
- **Env**: Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` placeholders to `.env.example`; do not commit real Turso tokens.
- **Scripts**: Add npm/scripts or standalone Node scripts for Turso schema apply, data export/import, and verification.
- **DB layer**: Update `src/lib/db/driver.js`, add `src/lib/db/adapters/libsqlAdapter.js`, and adjust repository/database call sites if async access is required.
- **Migrations**: Ensure existing schema version chain and additive sync can execute against Turso.
- **Docs**: Add operator README/instructions for creating/updating Turso DB and Vercel env setup.
- **Tests**: Add unit/integration coverage for driver selection, migration compatibility, and migration script dry-run behavior.
