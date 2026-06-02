# Architecture

Centralized B2B platform for provisioning and monitoring AI access across developer Teams.

## Product direction

Devlens provides an OpenAI-compatible endpoint (`/v1/*`) routing traffic across 20+ upstream providers with translation, fallback, streaming, and usage tracking.

## Core Components

### Next.js App Router (`src/app/`)
- Dashboard pages under `(dashboard)/dashboard/` (23 pages)
- API routes under `api/` (27 route groups)
- Clerk auth pages: sign-in, sign-up, onboarding
- Public landing page

### Routing Core (`open-sse/`)
- **Provider executors**: adapter layer for each upstream provider
- **Translators**: OpenAI-format → provider-native format + response back to OpenAI-format
- **Combo resolution**: ordered model fallback: model → provider → account → next provider → next model
- **SSE streaming**: normalized streaming across all providers
- **RTK compression**: token-aware tool result compression for streaming

### SSE/Request Handler (`src/sse/`)
- Request lifecycle management
- Usage extraction and persistence
- Team-scoped routing context

### Persistence (`src/lib/db/`)
- Multi-driver SQLite: libSQL (Turso) → bun:sqlite → better-sqlite3 → node:sqlite → sql.js
- Declarative schema with versioned migrations
- 12 repository modules for data access
- Team-scoped: every query includes `teamId`

### Auth
- **Dashboard**: Clerk Organizations → Teams, Clerk session + custom HMAC JWT fallback
- **API**: `Authorization: Bearer <api-key>` → HMAC hash lookup → team/user/role context
- Middleware (`src/middleware.ts`): route matcher for public vs protected routes

### UI Components (`src/shared/components/`)
- 43 reusable components (Header, Sidebar, modals, config snippets, etc.)
- Zustand state stores (7 files)
- Tailwind CSS v4 with blue-purple theme

## Data Flow

```
CLI/SDK
  │
  ▼ POST /v1/chat/completions
  │ Authorization: Bearer <api-key>
  ▼
Middleware (Clerk) → public route passthrough
  │
  ▼
V1 Auth (src/lib/apiKeyUtils.js)
  │ HMAC hash → apiKey lookup → teamId, userId, role
  ▼
Router (open-sse/)
  │ Resolve model → combo? provider? alias?
  │ Team-scoped: providers, combos, pricing
  ▼
Provider Executor (open-sse/executors/)
  │ Translate request → send to upstream → translate response
  ▼
Usage Logger
  │ Write usageHistory, update usageDaily
  ▼
SSE Stream → Client (with RTK compression if enabled)
```

## Request Lifecycle

1. Client sends OpenAI-format request to `/v1/chat/completions`
2. Middleware passes through (public route)
3. API Key auth resolves: `teamId`, `userId`, `role`, `apiKeyId`
4. Model resolver: check if model is combo → resolve first available
5. Provider selector: find enabled provider connection for model
6. Credential selector: pick account with valid token/API key
7. Provider executor: send translated request to upstream
8. Stream translator: normalize upstream SSE to OpenAI format
9. Usage: persist tokens, cost, RTK savings with team/user attribution
10. Return stream to client

## Boundaries

| Boundary | Mechanism |
|----------|-----------|
| Dashboard auth | Clerk session + role checks |
| API auth | HMAC API Key |
| Tenant | `teamId` on every query |
| Observability | Manager: team-wide, Developer: own-only |
| Provider credentials | Never returned to Developer |
| API Key plaintext | Shown once, stored as HMAC hash |

## Deployment

| Environment | Database | Notes |
|-------------|----------|-------|
| Vercel | Turso/libSQL | Requires `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |
| Docker | Local SQLite | `DATA_DIR=/var/lib/devlens`, port 20261 |
| Local dev | Local SQLite | `pnpm dev` on port 20262 |
| Docs | Static export | Cloudflare Pages |

## Module Map

| Concern | Location |
|---------|----------|
| Auth pages, middleware, webhooks | `src/app/sign-in/`, `src/app/sign-up/`, `src/app/onboarding/`, `src/middleware.ts` |
| V1 API routes | `src/app/api/v1/` |
| Management API routes | `src/app/api/(keys\|providers\|combos\|models\|pricing\|team\|usage\|reports\|rtk\|tunnel)/` |
| Provider routing core | `open-sse/executors/`, `open-sse/translator/`, `open-sse/router.js` |
| SSE handler | `src/sse/` |
| Database layer | `src/lib/db/` |
| Auth helpers | `src/lib/auth/` |
| OAuth integration | `src/lib/oauth/` |
| API key utils | `src/lib/apiKeyUtils.js` |
| Network/proxy | `src/lib/network/` |
| Usage fetcher | `src/lib/usage/` |

## Supported Providers (20+)

OpenAI, Anthropic, Google Gemini, Azure, Groq, Mistral, Together, DeepSeek, Perplexity, Cohere, xAI, Anthropic/Claude-compatible nodes, OpenAI-compatible nodes, Codex, Cursor, Kiro, GitLab, GitHub, and more.

## Format Translation

| Input Format | Target Providers |
|-------------|-----------------|
| OpenAI chat completions | Anthropic, Gemini, Cohere, Mistral, DeepSeek, Groq, xAI, Together, Perplexity |
| OpenAI responses | Codex (anthropic-codex), Kiro |
| OpenAI embeddings | OpenAI, Cohere, custom embed |
| OpenAI images | OpenAI, Stability, custom |
| OpenAI audio/TTS | OpenAI, ElevenLabs, custom |

## Known Constraints

- Vercel deployments require Turso (no local SQLite)
- DB driver auto-selects from chain: Turso → bun → better-sqlite3 → node:sqlite → sql.js
- RTK Pool is integer only, atomically decremented
- Manager role cannot use `/v1/*` API
- Pricing Override manually set wins over auto-fetched provider pricing
- Data migration from SQLite to Turso is operator-run, not auto-startup
