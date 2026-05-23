## 1. Dependencies and environment contract

- [x] 1.1 Add `@libsql/client` to app dependencies
- [x] 1.2 Update `.env.example` with Turso placeholders only: `TURSO_DATABASE_URL=libsql://your-db.turso.io` and `TURSO_AUTH_TOKEN=change-me`
- [x] 1.3 Document that real Turso tokens must be stored in local `.env`/`.env.local` and Vercel env vars, never committed
- [x] 1.4 Keep `DATA_DIR` documented as local SQLite fallback for development/self-hosted deployments

## 2. Turso/libSQL adapter

- [x] 2.1 Add `src/lib/db/adapters/libsqlAdapter.js` using `@libsql/client`
- [x] 2.2 Implement async adapter methods matching required DB operations: `run`, `get`, `all`, `exec`, `transaction` or a documented Turso-safe transaction equivalent
- [x] 2.3 Make adapter tolerate SQLite pragmas unsupported by Turso/libSQL
- [x] 2.4 Ensure all SQL parameter handling remains injection-safe and compatible with existing repository calls
- [x] 2.5 Add explicit close/no-op lifecycle behavior suitable for serverless
- [x] 2.6 Do not use sync wrappers, child processes, or deasync-style blocking around libSQL remote IO

## 3. Driver selection and runtime behavior

- [x] 3.1 Update `src/lib/db/driver.js` to select libSQL when `TURSO_DATABASE_URL` is present
- [x] 3.2 Pass `TURSO_AUTH_TOKEN` to libSQL client when required by remote URLs
- [x] 3.3 Preserve existing local SQLite fallback chain when Turso env is absent
- [x] 3.4 Avoid local WAL checkpoint timers and process signal handlers in Turso mode
- [x] 3.5 Add or adjust Vercel/Next route runtime settings if DB access requires Node.js runtime
- [x] 3.6 Update any affected tests that assume only local SQLite adapters exist

## 4. Async DB access compatibility

- [x] 4.1 Audit all `src/lib/db/repos/*` and API route DB call sites for sync assumptions
- [x] 4.2 Convert affected DB APIs/repos/routes to async where required by libSQL
- [x] 4.3 Keep public route response behavior unchanged while awaiting DB operations
- [x] 4.4 Verify Manager dashboard flows still load Provider Connections, Combos, Model Aliases, Pricing Overrides, RTK Pool, usage, and request logs
- [x] 4.5 Verify Developer flows still create/use API Keys and view personal usage

## 5. Schema migration compatibility

- [x] 5.1 Ensure `src/lib/db/migrate.js` can run versioned migrations against libSQL
- [x] 5.2 Ensure additive schema sync works against Turso or add Turso-specific schema inspection where needed
- [x] 5.3 Preserve `schemaVersion` semantics and monotonic migration ordering
- [ ] 5.4 Add a Turso-backed migration lock or equivalent coordination so concurrent Vercel cold starts cannot race schema migrations
  - Current implementation gap: `src/lib/db/migrate.js` has no lock/coordination path yet.
- [x] 5.5 Add tests for Turso driver selection and migration invocation using a mock or local libSQL-compatible target
- [x] 5.6 Confirm existing migrations `001`, `002`, and `003` remain idempotent against the new adapter

## 6. SQLite-to-Turso migration scripts

- [x] 6.1 Add script to apply/update Turso schema from current migration chain
- [x] 6.2 Add script to export an existing local SQLite DB from `DATA_DIR` or explicit `--sqlite-file`
- [x] 6.3 Add script to import exported data into Turso using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- [x] 6.4 Add `--dry-run` support or equivalent preflight validation for migration scripts
- [x] 6.5 Make import fail-fast by default when target tables already contain data
- [x] 6.6 Add optional explicit destructive reset mode such as `--replace` only if needed
- [x] 6.7 Add verification script/report comparing source and target row counts for key tables
- [x] 6.8 Document rerun behavior: fail-fast default, optional explicit reset, no silent skip-existing mode

## 7. Operator documentation

- [x] 7.1 Add database update README/instructions under an existing docs/scripts location
- [x] 7.2 Include Turso database creation/selection steps without embedding secrets
- [x] 7.3 Include local `.env` setup using placeholders for `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- [x] 7.4 Include Vercel env setup steps for the same variables
- [x] 7.5 Include commands for schema update, export, import, verify, and rollback considerations
- [x] 7.6 Include note that `DATA_DIR` remains local fallback and is not production persistence on Vercel
- [x] 7.7 Include warning that initial setup targets one production Turso database, so operators must confirm target URL before import/reset commands

## 8. Living specs sync

- [x] 8.1 Update `docs/living_spec/technical_spec/database-schema.md` to describe Turso production DB plus local SQLite fallback
- [x] 8.2 Update `docs/living_spec/technical_spec/local-dev-docker.md` where DB env/runtime instructions change
- [x] 8.3 Add ADR if implementation chooses an irreversible async DB boundary strategy or a non-obvious migration import mode
- [x] 8.4 Ensure docs use Devlens terms: Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, CLI Config Snippet

## 9. Verification

- [x] 9.1 Run `npm install` after dependency changes
- [x] 9.2 Run DB migration tests
- [x] 9.3 Run script dry-run against a sample local SQLite database
- [x] 9.4 Run Turso schema apply against configured test database
- [x] 9.5 Run `npm run build`
- [x] 9.6 Run `npm run lint`
- [x] 9.7 Run `npm test` or documented test command
