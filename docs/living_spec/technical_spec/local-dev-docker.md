# Local development and Docker

Local development can run without Turso credentials. If `TURSO_DATABASE_URL` is unset, Devlens stores SQLite data under `DATA_DIR`.

Use `DATA_DIR=/var/lib/devlens` in containers when local SQLite persistence is desired for development or self-hosted deployments. Mount that path as a volume.

For Turso-backed local testing, set:

```sh
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=change-me
```

`TURSO_DATABASE_URL` presence selects libSQL. `TURSO_AUTH_TOKEN` is passed when required by target URL. Turso mode does not rely on local SQLite files, WAL checkpoint timers, or local DB process signal handling.

Do not bake real Turso tokens into Docker images or committed env files. Use local `.env`, orchestration secrets, or Vercel env vars.

Vercel production must use Turso/libSQL and must not depend on local `DATA_DIR` persistence. Data migration from local SQLite to Turso is operator-run with scripts, not automatic app startup behavior.

Port guidance: Devlens dev ports should stay in `2026x` range for local agent work. Current package scripts and `.env.example` still reference `20128`; change-needed residue.
