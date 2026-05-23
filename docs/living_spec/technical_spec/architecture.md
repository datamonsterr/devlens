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
- SQLite stores Team-scoped relational data.
- Managers configure Team resources.
- Developers consume curated API access.

## New boundaries

- Dashboard auth boundary: Clerk session + role checks.
- API auth boundary: HMAC API Key.
- Tenant boundary: `teamId` on every Team-owned row and query.
- Observability boundary: Manager Team-wide, Developer own-only.
