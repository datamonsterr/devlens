## Context

9Router currently runs as a single-user local Next.js server. All data lives in JSON files on disk (`~/.9router/db.json`, `usage.json`). Auth is a simple JWT/password login with no concept of users, tenants, or roles. The UI is orange-themed and branded as "9Router".

Devlens transforms this into a centralized B2B web platform. The server runs as a single deployment (docker-compose for local dev, containerized for production). Multiple teams, each with managers and developers, share the same instance. Data is scoped by tenant (team). Authentication moves to Clerk for enterprise-grade auth with SSO/OIDC/MFA support.

Architecture remains Next.js API routes (no separate backend). SQLite replaces JSON files for persistence, keeping the operational simplicity of sql.js/better-sqlite3 while adding relational integrity and query capabilities needed for multi-tenancy.

## Goals / Non-Goals

**Goals:**
- Multi-tenant architecture where teams are isolated at the data layer
- Clerk authentication for all dashboard routes with role-based middleware
- Manager role: full CRUD over providers, combos, teams, settings; usage dashboards
- Developer role: API key self-service, model browsing, personal usage stats, API access via `/v1/*`
- Centralized SQLite database replacing local JSON files
- UI restyle from orange to blue-purple with full rebranding
- Docker-compose for reproducible local development
- Preserve core SSE/routing engine (`open-sse/`, `src/sse/`) adapted for multi-tenant usage tracking
- Repurpose gitbook as Devlens documentation site

**Non-Goals:**
- Real-time collaboration or WebSocket features
- Billing/payment integration (out of scope for initial platform)
- Data migration from existing 9router installs (greenfield for Devlens)
- PostgreSQL or other external database (sticking with SQLite)
- Separate backend server (Next.js API routes remain)
- OAuth provider onboarding changes beyond auth integration (existing provider connection model preserved)

## Decisions

### 1. Clerk for Authentication

**Decision**: Use `@clerk/nextjs` with Clerk Organizations for tenant isolation.

**Alternatives considered**:
- Auth0 — similar feature set, but Clerk's Next.js integration is simpler and has better React component support
- Custom auth with NextAuth — more work to build and maintain; Clerk is a managed service
- Keep JWT/password auth — doesn't support SSO, MFA, social login, or organization-level role management

**Rationale**: Clerk provides pre-built UI components (`<SignIn>`, `<UserButton>`), middleware for route protection, webhook-based role sync, and organization-level membership. This dramatically reduces auth implementation effort and gives enterprise features out of the box.

### 2. Role Mapping via Clerk Metadata

**Decision**: Map Clerk roles to Devlens roles through Clerk organization metadata. Clerk org membership determines tenant (team). `publicMetadata.role` on the user determines Manager vs Developer. No super-admin role exists — only Manager and Developer.

**Manager onboarding**: All self-sign-up users become managers. Sign-up form includes email, password, and organization name. On sign-up, the backend creates a Clerk Organization via Clerk Backend API, sets the user as org admin with role "manager", and the `organization.created` webhook creates the corresponding Devlens team.

**Developer onboarding**: Managers invite developers by email. Clerk sends a sign-up URL. Developer completes registration and is auto-added to the Clerk Organization with role "developer."

```
Clerk Org → Devlens Team (1:1)
Clerk User → Devlens User (with role: "manager" | "developer")
```

### 3. SQLite with Tenant-Scoped Tables

**Decision**: Single SQLite database file with `team_id` foreign key on all tenant-scoped tables. No per-tenant database files.

**Schema approach**:
```
teams(id, name, clerk_org_id, rtk_pool, created_at)
users(id, clerk_user_id, team_id, role, is_active, created_at)
api_keys(id, user_id, key_hash, name, is_active, last_used_at, created_at)
provider_connections(id, team_id, provider, ...)  -- existing schema + team_id
combos(id, team_id, name, models, ...)             -- existing schema + team_id
usage_entries(id, team_id, user_id, provider, model, tokens, cost, rtk_tokens_saved, timestamp)
rtk_pool_history(id, team_id, action, amount, remaining_after, timestamp)
pricing(id, team_id, model, input_price, output_price, source, created_at)
```

**Alternatives considered**:
- Per-team SQLite files — isolation at filesystem level but harder to query across teams and manage
- PostgreSQL — more scalable but adds infra complexity; SQLite is sufficient for initial platform scale
- Keep JSON files per team — no referential integrity, poor query performance for dashboards

**Rationale**: A single SQLite file with `team_id` columns is the simplest path. better-sqlite3 gives synchronous, fast queries which is ideal for the dashboard analytics use case. The existing codebase already uses sql.js; better-sqlite3 is the optional faster alternative already listed in optionalDependencies.

### 4. Next.js Middleware Chain

**Decision**: Use Next.js `middleware.ts` for Clerk auth check on all `/dashboard/*` and `/api/*` routes (excluding `/api/v1/*`), then per-route role checks in API route handlers.

```
Request → Clerk middleware (auth) → Route handler → Role check → Business logic
```

**API authentication for `/v1/*`**: Developer API keys sent as `Authorization: Bearer <key>`. The route handler validates the key hash against the database, resolves the user and team, then proxies to the SSE/routing engine with team context.

**Alternatives considered**:
- All auth in a single middleware — too coarse; `/v1/*` needs API key auth, not Clerk session auth
- Separate API gateway — adds complexity without clear benefit at this scale

### 5. UI Restyle Strategy

**Decision**: Swap Tailwind CSS design tokens at the theme level. Replace orange-centric variables with blue-purple palette. No component-level color changes needed if the existing UI uses semantic tokens consistently.

**Color mapping**:
```
orange-500 → blue-600
orange-600 → purple-600
orange-700 → purple-700
amber-*    → indigo-*
```

**Alternatives considered**:
- Full CSS rewrite — unnecessary if semantic tokens are used
- CSS-in-JS migration — tailwind is already in place; no reason to change

**Rationale**: If the current UI uses Tailwind utility classes directly with orange colors, a global find-replace with verification is needed. If it uses CSS variables, just swap the variable values. Audit required.

### 6. Module Removal Strategy

**Decision**: Delete in this order: CLI tools routes → MITM module → cloud sync → i18n files. Each deletion followed by test verification to catch broken imports. CLI auto-config is replaced by copy-paste configuration snippets in the web UI for three tools: Claude Code, OpenCode, and Codex.

**Removal targets**:
- `cli/` — standalone npm package, no internal deps
- `src/app/api/cli-tools/*` — delete all route files
- `src/mitm/` — delete entire directory; remove MITM references from `server-init.js` and Dockerfile
- `src/lib/initCloudSync.js`, `src/shared/services/cloudSyncScheduler.js` — delete files
- `src/app/api/sync/*`, `src/app/api/cloud/*` — delete route files
- `i18n/`, `README.zh-CN.md`, `README.vi.md` — delete files
- Remove `bcryptjs`, `open`, `ora` from package.json dependencies

### 7. RTK Pool Architecture

**Decision**: Team-level RTK pool stored as an integer column on the `teams` table. Pool operations use additive semantics by default (top-up): `PUT /api/team/rtk-pool { amount: N }` adds N to the current pool. A `mode: "reset"` parameter overwrites the pool for billing cycle resets. Decremented atomically during streaming requests.

```
teams.rtk_pool: INTEGER (remaining tokens)
On usage: UPDATE teams SET rtk_pool = rtk_pool - consumed WHERE team_id = ? AND rtk_pool >= consumed
If pool insufficient: RTK disabled for that request (graceful degradation)
```

**Rationale**: Additive default prevents accidental pool destruction from an unintended PUT. The reset mode handles monthly billing cycles explicitly. The existing `open-sse/rtk/` module already handles the content compression logic; it just needs a multi-tenant pool source instead of a local boolean toggle.

### 8. Pricing Model

**Decision**: Pricing auto-fetched from provider APIs where available (e.g., OpenAI model pricing endpoint). Stored in `pricing` table with `source: "auto" | "manual"`. Managers can override per-model prices via the pricing UI, which sets `source: "manual"` and prevents auto-refresh for that model.

**Rationale**: Auto-fetch reduces manual data entry for managers. Manual override handles cases where provider API pricing is unavailable or the manager wants to set custom cost accounting (e.g., internal chargeback rates).

## Risks / Trade-offs

- **[Risk] SQLite concurrent write limits** → Mitigation: better-sqlite3 handles this well for moderate traffic; WAL mode enabled. For high-scale production, migration path to PostgreSQL exists (same schema, just swap driver).
- **[Risk] Clerk dependency lock-in** → Mitigation: Clerk auth is isolated in middleware and a few route handlers. Replacing it with another provider would require changing ~3 files. User identity in the DB uses `clerk_user_id` which can be migrated.
- **[Risk] Brand rename breaks imports** → Mitigation: Use `grep`-based rename with verification. Most references are in strings and comments, not import paths (project name is `9router-app` in package.json but not in file paths).
- **[Risk] Module removal breaks hidden dependencies** → Mitigation: Delete one module group at a time, run full test suite and build between each deletion. This catches cascading breakage early.
- **[Trade-off] Single SQLite file vs per-tenant files** → Single file is simpler but all tenants share one I/O path. Acceptable for initial scale; can shard later.
- **[Trade-off] RTK pool integer vs decimal** → Integer is simpler but prevents fractional token savings. Acceptable; most token savings are whole-token operations.

## Migration Plan

1. **Phase 1 — Auth & DB**: Install Clerk, create SQLite schema with teams/users/api_keys/rtk_pool_history/pricing tables, add Clerk middleware, build role-check middleware, implement manager sign-up flow with auto org creation. Remove old JWT/password auth entirely.
2. **Phase 2 — Feature Migration**: Build team management, developer invitation via Clerk email, API key system, model browser, manager dashboard, RTK pool with additive semantics, pricing auto-fetch + manual override. Existing provider/combo management adapts to team-scoped queries.
3. **Phase 3 — Removal & Cleanup**: Delete CLI tools, MITM, cloud sync, i18n files. Replace CLI tools with copy-paste config snippets for Claude Code, OpenCode, Codex. Verify tests pass after each deletion batch.
4. **Phase 4 — UI & Branding**: Swap color tokens, rename all strings, update README, repurpose gitbook as /docs route.
5. **Phase 5 — Infrastructure**: Create docker-compose.yml (app service + data volume), update Dockerfile (remove MITM copies), verify end-to-end local dev workflow.

**Rollback**: Since this is a fork with no existing production deployment, rollback is simply reverting to the last commit before changes. Each phase should be a separate commit for granular revert capability.

## Open Questions

All resolved during requirement analysis:

1. Clerk Organizations map 1:1 to Devlens teams. One manager per team. Team auto-created on manager sign-up.
2. Developers see only their own usage. Managers see all team usage including removed developers (full attribution retained).
3. Gitbook documentation site served from same Next.js app under `/docs` route.
4. CLI config replaced by copy-paste snippets for Claude Code, OpenCode, and Codex in the web UI.
5. RTK pool uses additive default (top-up) with optional `mode: "reset"` for billing cycle resets.
6. Pricing auto-fetched from provider APIs by default; manager can override per-model prices.
7. Manager sign-up form: email + password + organization name. No role picker — all sign-ups are managers.
8. Developer onboarding: manager enters email → Clerk sends sign-up URL → developer completes registration → auto-added to org.
9. No super-admin role. Only Manager and Developer.
10. Docker compose: single Next.js app service + mounted volume for SQLite data.
11. No rate limiting on `/v1/*` for MVP.
