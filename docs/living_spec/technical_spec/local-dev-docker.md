# Local development and Docker

Local development can run without Turso credentials. If `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are unset, Devlens stores SQLite data under `DATA_DIR`.

Use `DATA_DIR=/var/lib/devlens` in containers when local SQLite persistence is desired. Mount that path as a volume.

For Turso-backed local testing, set:

```sh
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=change-me
```

Do not bake real Turso tokens into Docker images or committed env files. Use local `.env`, orchestration secrets, or Vercel env vars.

Port guidance: Devlens dev ports should stay in `2026x` range for local agent work.
