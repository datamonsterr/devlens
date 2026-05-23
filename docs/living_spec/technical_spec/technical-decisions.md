# Technical decisions

## Accepted

- Clerk Organizations map 1:1 to Devlens Teams.
- One Manager per Team for MVP.
- Developers join by Manager invitation.
- Single SQLite database with Team-scoped tables.
- `/v1/*` uses Developer API Keys, not Clerk sessions.
- API Key plaintext shown once; stored as HMAC hash.
- Provider Nodes are Team-scoped.
- Cloudflared stays; Tailscale removed.
- `/v1beta/*` stays for compatibility.
- CLI auto-config becomes copyable CLI Config Snippets.
- Developers see own console logs only.
- Default Devlens local port: `20261`.
- RTK Pool top-up is additive by default; reset is explicit.
- Vercel production database target is Turso/libSQL selected by `TURSO_DATABASE_URL`; local SQLite remains default fallback when absent.
- SQLite-to-Turso data migration is explicit operator script workflow; app startup must not auto-import local data.

## Current code mismatches

- Package scripts and `.env.example` still use `20128`.
- Some schema/query paths are not fully Team-scoped.
- Proxy Pools still exist in schema/code.
- Legacy/9router surfaces still exist.
