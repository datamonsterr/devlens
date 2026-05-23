# SQLite to Turso operator runbook

Devlens production on Vercel uses Turso/libSQL via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Local SQLite remains fallback when Turso env is absent.

## Safety rules

- Never commit real Turso tokens.
- Confirm `TURSO_DATABASE_URL` before import; initial setup targets one production Turso database.
- Import fails by default when target tables contain rows.
- Use `--dry-run` before any schema or data command.
- Keep local SQLite backup before export.

## Env

Put real values in `.env`, `.env.local`, shell env, or Vercel env vars:

```sh
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=change-me
```

Keep `DATA_DIR` for local SQLite fallback and export source.

## Commands

Preflight local source and Turso connection:

```sh
npm run turso:preflight -- --sqlite-file /path/to/data.sqlite --dry-run
```

Apply current schema to Turso:

```sh
npm run turso:schema -- --dry-run
npm run turso:schema
```

Export local SQLite:

```sh
npm run turso:export -- --sqlite-file /path/to/data.sqlite --export-file tmp/sqlite-export.json --dry-run
npm run turso:export -- --sqlite-file /path/to/data.sqlite --export-file tmp/sqlite-export.json
```

Import into Turso:

```sh
npm run turso:import -- --export-file tmp/sqlite-export.json --dry-run
npm run turso:import -- --export-file tmp/sqlite-export.json
```

Verify row counts:

```sh
npm run turso:verify -- --export-file tmp/sqlite-export.json
```

## Rollback considerations

If import fails before completion, inspect target row counts and recreate/reset target Turso DB manually before rerun. Use `--replace` only after confirming `TURSO_DATABASE_URL`, backing up target data, and accepting that target table rows will be deleted before import.
