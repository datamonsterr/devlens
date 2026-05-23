# Architecture

## Product direction

Devlens is centralized B2B platform for provisioning and monitoring AI access across developer Teams.

## Preserved 9router core

- Next.js API routes.
- `/v1/*` OpenAI-compatible API.
- `src/sse/` request handling.
- `open-sse/` provider execution, fallback, translation, streaming.
- Provider Connection, Combo, Model Alias, Pricing foundation.

## Devlens changes

- Clerk Organizations become Teams.
- Clerk session protects dashboard/management APIs.
- API Keys protect `/v1/*`.
- SQLite semantics store Team-scoped relational data.
- Vercel production uses Turso/libSQL when `TURSO_DATABASE_URL` is present.
- Local SQLite remains development/self-hosted fallback when Turso env is absent.
- Managers configure Team resources.
- Developers consume curated API access.

## New boundaries

- Dashboard auth boundary: Clerk session + role checks.
- API auth boundary: HMAC API Key.
- Tenant boundary: `teamId` on every Team-owned row and query.
- Observability boundary: Manager Team-wide, Developer own-only.
