## Why

9Router was built as a local AI routing gateway for individual developers running on their own machines. Devlens transforms it into a centralized B2B web platform where managers provision AI access for developer teams, control model routing via combos and providers, and monitor usage across their organization — while developers consume a curated OpenAI-compatible API with token savings (RTK) and model discovery. This shift enables organizations to centralize AI spend, enforce governance, and simplify developer onboarding.

## What Changes

- **BREAKING**: Replace JWT/password dashboard auth with Clerk authentication (OIDC, SSO, MFA, social login)
- **BREAKING**: Restructure from single-user local runtime to multi-tenant platform with role-based access (Manager / Developer)
- **BREAKING**: Remove CLI tools entirely — delete `cli/` directory and `src/app/api/cli-tools/*` routes
- **BREAKING**: Remove MITM proxy module — delete `src/mitm/` and all MITM-related API routes
- **BREAKING**: Remove Chinese documentation — delete `i18n/`, `README.zh-CN.md`, `README.vi.md`, `README.ja-JP.md`
- **BREAKING**: Remove cloud sync feature — centralized server architecture replaces device-to-device sync
- Add Clerk authentication middleware protecting all dashboard and management routes
- Add role-based authorization: Manager (full admin) vs Developer (API consumer) with middleware enforcement
- Add team management — CRUD teams, invite/remove developers, assign API key quotas
- Add per-developer API key generation tied to Clerk user identity, with create/revoke/rotate lifecycle
- Add manager dashboard with aggregate and per-developer usage/cost/time-series analytics
- Add developer model browser showing available models, combos, providers, and pricing (read-only)
- Add team-wide RTK token savings pool managed by managers, consumed by developers during streaming requests
- Add docker-compose for local development and testing with app + volume services
- Restyle UI from orange theme to blue-purple color scheme (Tailwind CSS variable swap)
- Rename all branding: 9Router → Devlens, 9router → devlens
- Repurpose `gitbook/` as Devlens documentation site
- Rewrite README.md as Devlens documentation
- Create `docs/feature_spec/` and `docs/technical_spec/` with architecture designs and use case breakdowns
- Configure `.opencode/` with agent setup, skills, and subagents for test/debug workflows
- Update all tests to match new architecture; ensure test suite passes

## Capabilities

### New Capabilities

- `clerk-auth`: Authentication via Clerk — sign up, sign in, session management, OIDC integration. Replaces JWT/password auth in `src/app/api/auth/*` and `src/proxy.js`. Protects all dashboard and management routes. Maps Clerk organization membership and metadata to Devlens roles (Manager/Developer).
- `role-based-access`: Role-based authorization middleware. Manager role grants full access to provider management, combo CRUD, team management, usage dashboards, and settings. Developer role grants access to API key management, model browsing, personal usage stats, and the `/v1/*` compatibility API. Middleware enforced at route level.
- `team-management`: Managers create and manage teams. Invite developers by email (linked to Clerk user). Developers belong to one team. Each team has an RTK token pool, API key quotas, and usage aggregation.
- `developer-api-keys`: Per-developer API key generation linked to Clerk identity. Keys grant access to `/v1/*` compatibility endpoints. Lifecycle: create (plaintext shown once), revoke, rotate. Stored as HMAC hash in SQLite.
- `manager-dashboard`: Manager-facing analytics page with aggregate team usage/cost metrics, per-developer breakdowns, time-series charts (daily/weekly/monthly), per-model cost distribution, per-provider volume. Built with recharts (existing dependency).
- `model-browser`: Developer-facing page showing all available models grouped by provider, combo model sequences, pricing information, and capability metadata. Read-only — developers cannot modify combos, providers, or settings.
- `token-savings-rtk`: Team-wide RTK pool. Manager sets pool size per team. Developer streaming requests via `/v1/*` consume from pool for token savings. Team reaches zero, RTK disabled until manager tops up. Built on existing `open-sse/rtk/` infrastructure adapted for multi-tenant pool accounting.
- `platform-restructure`: Structural migration from single-user local service to centralized multi-tenant web platform. Removes local state assumptions (`~/.9router/` paths, `DATA_DIR` per-machine). Centralizes data in a single SQLite database with tenant-scoped tables. Adds docker-compose for local dev. Removes modules not relevant to the centralized B2B model.

### Modified Capabilities

None — the existing 9router codebase has no spec-defined capabilities in `openspec/specs/`.

## Impact

- **Code**: Every `src/app/api/*` route, all UI pages (`src/app/`), auth layer (`src/proxy.js`, `src/dashboardGuard.js`), persistence (`src/lib/localDb.js`, `src/lib/usageDb.js`), and SSE core (`src/sse/`, `open-sse/`) restructured for multi-tenancy
- **Dependencies**: Add `@clerk/nextjs`; remove `bcryptjs` (no password hashing needed); remove `open`, `ora` (CLI-only deps); keep sql.js plus better-sqlite3 for centralized SQLite
- **Infrastructure**: New `docker-compose.yml` with app service + persistent volume for SQLite data; Dockerfile updated for Devlens branding
- **Deleted**: `cli/`, `src/mitm/`, `gitbook/` (repurposed, not deleted), `i18n/`, `src/app/api/cli-tools/*`, `src/lib/initCloudSync.js`, `src/shared/services/cloudSyncScheduler.js`, `src/app/api/sync/*`, `src/app/api/cloud/*`, `CHANGELOG.md`, `README.zh-CN.md`
- **Renamed**: All branding strings (9Router→Devlens), `captain-definition`, Docker image label `org.opencontainers.image.title`, package.json name/description
- **Documentation**: Rewrite README.md; create `docs/feature_spec/` (use cases) and `docs/technical_spec/` (architecture, design, conventions)
- **Tests**: Update all tests referencing removed modules, old auth flow, or 9Router names
