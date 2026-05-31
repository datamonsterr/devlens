# Devlens v0.5.0

Centralized B2B platform for provisioning and monitoring AI access across developer teams.

## Features

- **API Key System** — Per-developer HMAC-hashed keys with rotation, revocation, and quota limits
- **Provider Connections** — Configure upstream AI providers (OpenAI, Anthropic, Google, 15+ more) with priority, OAuth, and health checks
- **Combos** — Ordered fallback chains across models and providers for automatic failover
- **Model Browser** — Browse 200+ models grouped by provider with pricing, capability filters, and aliases
- **RTK Token Pool** — Team-wide token budget; automatic tool-output compression during streaming to reduce cost
- **Pricing Overrides** — Per-model cost control with auto-fetch from provider APIs and manual overrides
- **Usage Analytics** — Team and per-developer dashboards with time-series charts, model breakdowns, and provider topology graphs
- **AI ROI Reports** — Manager reports tracking cost savings from RTK compression and provider routing efficiency
- **CLI Config Snippets** — Copy-paste config blocks for Claude Code, OpenCode, Codex, Cursor, and 15+ tools
- **OpenAI-Compatible API** — `/v1/*` endpoints serve any OpenAI-compatible client through configured providers and combos
- **Format Translation** — Automatic request/response translation between OpenAI, Claude, Gemini, Kiro, Cursor, and more
- **Media Providers** — TTS, STT, image generation, and embeddings through configured providers
- **Clerk Authentication** — SSO, OIDC, social login, organization-bound teams via Clerk
- **Team Management** — Invite developers, control API key quotas, manage roles (manager/developer)
- **Developer Dashboard** — Personal usage, API key management, model browsing, profile settings

## Quick Start

```bash
cp .env.example .env
# Edit .env with your Clerk keys, JWT_SECRET, and database config
pnpm install
pnpm dev
```

App available at `http://localhost:20262`

### Docker

```bash
docker compose up
```

App available at `http://localhost:20261`

> Set required env vars in `docker-compose.yml` before starting: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `JWT_SECRET`.

## Development

Requires Node.js 22 (set via `mise.toml`), pnpm via corepack.

```bash
pnpm install
pnpm dev          # Next.js dev server on port 20262
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Unit + integration tests (Vitest)
```

Also supports Bun:

```bash
pnpm dev:bun      # Bun dev server
pnpm build:bun    # Bun production build
```

### Database

SQLite locally via `better-sqlite3` (or `sql.js` fallback). Turso/libSQL on Vercel production.

Turso migration scripts:

```bash
pnpm turso:preflight    # Verify schema compatibility
pnpm turso:schema       # Apply schema to Turso
pnpm turso:export       # Export local SQLite
pnpm turso:import       # Import to Turso
pnpm turso:verify       # Verify migration
```

## Tech Stack

- Next.js 16, React 19
- SQLite (better-sqlite3 / sql.js) and Turso/libSQL
- Clerk for authentication and organization management
- Tailwind CSS 4, Recharts, Monaco Editor, @xyflow/react, @dnd-kit
- Open-SSE routing engine for provider translation, streaming, and RTK compression
- Vitest for testing
- pnpm for package management, Bun as optional runtime

## Deployment

- **Docker** — `docker compose up` with provided `Dockerfile` (multi-stage, node:22-alpine)
- **Vercel** — `vercel.json` with Next.js framework preset and pnpm build/install commands

## API Surface

| Area | Endpoints |
|------|-----------|
| Chat Completions | `/v1/chat/completions`, `/v1beta/*` (Anthropic Messages) |
| Embeddings | `/v1/embeddings` |
| Images | `/v1/images/generations` |
| TTS / STT | `/v1/audio/transcriptions`, `/v1/audio/speech` |
| Search | `/v1/search` |
| Responses | `/v1/responses` |

Requests are routed through provider connections, combos, and format translators automatically.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, request lifecycle, data model, deployment topology
- [Docker Deployment](DOCKER.md) — Docker setup for users and developers
- [SQLite to Turso Migration](docs/sqlite-to-turso.md) — Runbook for migrating local SQLite to Turso/libSQL

## License

MIT © 2024-2026 decolua and contributors
