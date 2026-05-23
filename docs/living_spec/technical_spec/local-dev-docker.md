# Local development and Docker

## Local port

Use `20261` for Devlens local app unless task explicitly chooses another `2026x` port.

Expected app URL:

```text
http://localhost:20261
```

## Development

```bash
npm install
npm run dev
```

Local Clerk credentials live in `.env` or `.env.local`. Vercel production receives Clerk credentials from the Vercel integrated Clerk environment.

Local development can run without Turso credentials. If `TURSO_DATABASE_URL` is unset, Devlens stores SQLite data under `DATA_DIR`.

For Turso-backed local testing, set:

```sh
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=change-me
```

`TURSO_DATABASE_URL` presence selects libSQL. `TURSO_AUTH_TOKEN` is passed when required by target URL. Turso mode does not rely on local SQLite files, WAL checkpoint timers, or local DB process signal handling.

Do not bake real Clerk keys or Turso tokens into Docker images or committed env files. Use local `.env`, orchestration secrets, Vercel integrated Clerk env vars, or Vercel env vars.

## Docker

Docker Compose should run one Next.js app service with mounted SQLite data volume for development or self-hosted deployments. Use `DATA_DIR=/var/lib/devlens` in containers and mount that path as a volume when local SQLite persistence is desired.

Vercel production must use Turso/libSQL and must not depend on local `DATA_DIR` persistence. Data migration from local SQLite to Turso is operator-run with scripts, not automatic app startup behavior.

## 9router change

Existing `20261` references must migrate to `20261` to avoid current 9router port range.
