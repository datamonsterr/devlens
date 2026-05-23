# High-level design

```mermaid
flowchart LR
  DeveloperClient[CLI or SDK] --> V1[/v1/* API]
  Browser[Dashboard] --> Dashboard[/dashboard + /api management]
  Dashboard --> Clerk[Clerk Session]
  Clerk --> TeamContext[Team Context]
  V1 --> ApiKey[API Key Auth]
  ApiKey --> TeamContext
  TeamContext --> DB[(Turso/libSQL or local SQLite)]
  TeamContext --> Router[open-sse router]
  Router --> Providers[Upstream Providers]
  Router --> Usage[Usage + RTK Accounting]
  Usage --> DB
```

## Database runtime

- Vercel production: `TURSO_DATABASE_URL` selects Turso/libSQL durable DB.
- Local dev/self-hosted fallback: absent `TURSO_DATABASE_URL` selects local SQLite under `DATA_DIR`.
- Target: startup schema migrations coordinate with Turso-backed lock so concurrent cold starts do not race DDL; current code still lacks lock implementation.
- Local SQLite to Turso data migration is operator-run script workflow, not automatic startup import.

## Flow

1. Manager creates Team through Clerk Organization.
2. Manager configures Provider Connections, Combos, Pricing Overrides, RTK Pool.
3. Developer creates API Key.
4. CLI calls `/v1/*` with API Key.
5. API Key resolves Team and Developer.
6. Router resolves Team-scoped resources.
7. Usage, cost, RTK savings persist with Team and Developer.
