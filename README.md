# Devlens

Centralized AI provider management for teams. Manage API keys, monitor usage, and scale AI access across your organization.

## Features

- **Team Management**: Create teams, invite developers, control API key quotas
- **Clerk Authentication**: SSO, OIDC, social login via Clerk
- **API Key System**: Per-developer API keys with HMAC security, rotation, and revocation
- **Manager Dashboard**: Aggregate team usage analytics with time-series charts and per-developer breakdowns
- **Model Browser**: Browse available AI models grouped by provider with pricing and capability info
- **RTK Token Savings**: Team-wide token pool for automatic request compression and cost reduction
- **Provider Management**: Configure AI provider connections, combos, and model aliases
- **OpenAI-Compatible API**: `/v1/*` endpoints for Claude Code, OpenCode, Codex, and custom clients

## Quick Start

```bash
docker compose up
```

App available at `http://localhost:20261`

## Development

```bash
npm install
npm run dev
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design.

## Tech Stack

- Next.js 16, React 19
- SQLite via better-sqlite3 / sql.js
- Clerk for authentication
- Tailwind CSS 4, Recharts
- Open-SSE routing engine for provider translation

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Tech Stack](docs/technical_spec/techstack.md)
- [Feature Specs](docs/feature_spec/)
- [ADR](docs/adr/)
