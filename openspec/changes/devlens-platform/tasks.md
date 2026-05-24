## 1. Auth & Database Foundation

- [x] 1.1 Install `@clerk/nextjs` and configure Clerk provider in Next.js app
- [x] 1.2 Add Clerk middleware (`middleware.ts`) protecting `/dashboard/*` and `/api/*` (excluding `/api/v1/*`)
- [x] 1.3 Create sign-up page with team/org configuration (email, password, organization name) — auto-create Clerk Organization via Clerk Backend API on submission
- [x] 1.4 Create sign-in page using Clerk's `<SignIn>` component
- [x] 1.5 Wire up `<UserButton>` in layout for session management and logout
- [x] 1.6 Design SQLite schema: `teams`, `users`, `api_keys`, `usage_entries`, `rtk_pool_history`, `pricing` tables with `team_id` foreign keys
- [x] 1.7 Create database initialization and migration runner in `src/lib/db.js`
- [x] 1.8 Add `team_id` column to existing entity tables: `provider_connections`, `combos`, `model_aliases`, `provider_nodes`, `settings`
- [x] 1.9 Implement Clerk webhook handlers: `organization.created` → auto-create team, `user.created`/`user.updated` → sync roles, `organizationMembership.created` → auto-create developer user record
- [x] 1.10 Remove old JWT/password auth: delete `src/proxy.js`, `src/app/api/auth/login/route.js`, `src/dashboardGuard.js`
- [x] 1.11 Remove `bcryptjs` from dependencies

## 2. Role-Based Access Control

- [x] 2.1 Create `src/lib/auth.js` with `requireRole()` utility that checks Clerk session metadata against required roles
- [x] 2.2 Create `src/lib/teamContext.js` with `getTeamContext()` that resolves team_id from Clerk org ID for the current user
- [x] 2.3 Apply role checks to all existing management API routes (providers, combos, aliases, nodes, pricing, settings)
- [x] 2.4 Create navigation/sidebar component that conditionally renders Manager vs Developer menu items
- [x] 2.5 Add role-based visibility to UI action buttons (create/edit/delete hidden for developers)

## 3. Module Removal

- [x] 3.1 Delete `cli/` directory and remove from workspace
- [x] 3.2 Delete `src/app/api/cli-tools/` directory and all sub-routes
- [x] 3.3 Delete `src/mitm/` directory
- [x] 3.4 Remove MITM references from `src/server-init.js`
- [x] 3.5 Update Dockerfile: remove MITM file copies and `node-forge` copy
- [x] 3.6 Delete `src/lib/initCloudSync.js` and `src/shared/services/cloudSyncScheduler.js`
- [x] 3.7 Delete `src/app/api/sync/` and `src/app/api/cloud/` directories
- [x] 3.8 Delete `i18n/` directory, `README.zh-CN.md`, `README.vi.md`, `README.ja-JP.md`
- [x] 3.9 Remove `open` and `ora` from dependencies
- [x] 3.10 Create CLI config snippet UI component showing copyable configs for Claude Code, OpenCode, and Codex (replacing deleted CLI tools)
- [x] 3.11 Run build and test suite; fix any broken imports from removals

## 4. Team Management

- [x] 4.1 Create `src/app/api/team/route.js` with GET (view own team) and PUT (update name) handlers
- [x] 4.2 Create `src/app/api/team/members/route.js` with GET (list members), POST (invite by email via Clerk), DELETE (remove) handlers
- [x] 4.3 Create `src/app/api/team/settings/route.js` for team-level configuration (quota, defaults)
- [x] 4.4 Implement developer invitation flow: manager enters email → Clerk sends sign-up URL → developer completes registration → `organizationMembership.created` webhook creates local record
- [x] 4.6 Handle removed developer case: mark user inactive, revoke API keys, retain usage data with full attribution

## 5. Developer API Keys

- [x] 5.1 Create `src/app/api/keys/route.js` with POST (create key) and GET (list keys) handlers
- [x] 5.2 Create `src/app/api/keys/[id]/route.js` with GET (metadata), DELETE (revoke) handlers
- [x] 5.3 Create `src/app/api/keys/[id]/rotate/route.js` with POST handler
- [x] 5.4 Implement HMAC key hashing utility in `src/lib/apiKeyUtils.js`
- [x] 5.5 Add API key authentication middleware for `/v1/*` routes — validate Bearer token, resolve user and team
- [x] 5.6 Update `/v1/*` route handlers to accept resolved team/user context from API key auth
- [x] 5.7 Create API Keys UI page at `src/app/dashboard/keys/` for developers to manage their keys
- [x] 5.8 Add manager-level key management view showing all team keys

## 6. Manager Dashboard

- [x] 6.1 Create `src/app/api/usage/dashboard/route.js` with GET handler returning aggregate + per-developer stats for a time period
- [x] 6.2 Create aggregate overview component with total tokens, cost, requests, active developers
- [x] 6.3 Create time-series chart component using recharts for daily token consumption
- [x] 6.4 Create model cost distribution chart (pie/donut) using recharts
- [x] 6.5 Create provider volume bar chart using recharts
- [x] 6.6 Create per-developer breakdown table with sortable columns
- [x] 6.7 Add time period selector (7d, 30d, this month, custom range)
- [x] 6.8 Add CSV export functionality for usage data
- [x] 6.9 Add auto-refresh (60s poll) and manual refresh button
- [x] 6.10 Add pricing management UI: auto-fetched provider prices displayed, manager can override per-model with custom prices
- [x] 6.11 Create Manager Dashboard page at `src/app/dashboard/`

## 7. Model Browser (Developer)

- [x] 7.1 Create `src/app/api/models/browse/route.js` returning all models, combos, providers, and pricing in read-only mode
- [x] 7.2 Create model listing component grouped by provider with pricing display
- [x] 7.3 Create combo visualization component showing fallback model sequences
- [x] 7.4 Create model search input and provider filter dropdown
- [x] 7.5 Create capability badges component (Vision, Tool Use, Streaming, context window)
- [x] 7.6 Add API base URL display with copy-to-clipboard button
- [x] 7.7 Add provider status indicators (online/offline badges)
- [x] 7.8 Create Model Browser page at `src/app/dashboard/models/`

## 8. Token Savings (RTK)

- [x] 8.1 Create `src/app/api/team/rtk-pool/route.js` with GET (status) and PUT (additive top-up default, reset mode) handlers
- [x] 8.2 Create `src/app/api/team/rtk-pool/history/route.js` with GET handler for pool change audit log
- [x] 8.3 Adapt `open-sse/rtk/` to read pool from `teams.rtk_pool` column (additive semantics) instead of local boolean toggle
- [x] 8.4 Implement atomic pool decrement with `WHERE rtk_pool >= consumed` guard; disable RTK gracefully when pool at zero
- [x] 8.5 Add `rtk_tokens_saved` column to `usage_entries` table
- [x] 8.6 Create developer-facing RTK status API at `src/app/api/rtk/status/route.js` (active/inactive, no pool amount exposed)
- [x] 8.7 Create RTK Pool Management UI for managers (top-up, reset, view history)
- [x] 8.8 Add RTK status indicator in Model Browser for developers (active/inactive)

## 9. UI Restyle — Blue-Purple Theme

- [x] 9.1 Audit current Tailwind color usage across all components for orange/amber classes
- [x] 9.2 Replace orange/amber color classes with blue/purple equivalents throughout codebase
- [x] 9.3 Update Tailwind config with blue-purple primary palette
- [x] 9.4 Update logo, favicon, and brand assets (if any exist in `public/`)
- [x] 9.5 Update page titles, meta tags, and manifest references

## 10. Branding — 9Router to Devlens

- [x] 10.1 Rename in `package.json`: name → `devlens-app`, description → Devlens reference
- [x] 10.2 Rename in `Dockerfile`: image label, comments, ENV references (DATA_DIR path if hardcoded)
- [x] 10.7 Rename remaining occurrences via global grep: `9Router`, `9router`, `9ROUTER`

## 11. Documentation

- [x] 11.1 Rewrite `README.md` as Devlens overview with features, setup, and architecture links
- [x] 11.9 Create `CONTEXT.md` with domain glossary (terms: Team, Manager, Developer, RTK Pool, Combo, Provider Connection, API Key)
- [x] 12.1 Create `docker-compose.yml` with `app` service (Next.js on port 20261) and named volume for SQLite data
- [x] 12.2 Update `Dockerfile` for Devlens: remove MITM copies, update labels, adjust DATA_DIR path
- [x] 12.3 Add `.dockerignore` entries for removed modules
- [ ] 12.4 Test `docker compose up` — verify app starts, Clerk auth works, data persists across restarts

## 13. Agent & OpenCode Setup

- [x] 13.1 Initialize `.opencode/` configuration with project-specific context and conventions
- [x] 13.2 Install `skill-creator` skill via `npx skills install skill-creator`
- [x] 13.3 Install `find-skills` skill via `npx skills install find-skills`
- [x] 13.4 Use find-skills to locate and install `agent-browser` and related skills
- [x] 13.5 Create subagent for writing unit tests: reads source, writes test file, runs test, reports results
- [x] 13.6 Create subagent for running unit tests: executes vitest, captures failures, reports summary
- [x] 13.7 Create subagent for debugging: adds log statements, reruns test, reads log output, fixes, loops until pass
- [x] 13.8 Configure subagents to read/update `docs/` before opening new OpenSpec changes and after finishing implementation

## 14. Tests

- [x] 14.1 Delete tests for removed modules (CLI tools, MITM, cloud sync)
- [x] 14.2 Update test imports referencing renamed/removed files, modules, or API routes
- [x] 14.3 Update test assertions referencing 9Router brand names
- [x] 14.4 Update test fixtures and mocks for Clerk auth (replace JWT/password mocks)
- [x] 14.5 Add tests for `requireRole()` authorization utility
- [x] 14.6 Add tests for API key creation, validation, and revocation
- [x] 14.7 Add tests for team management endpoints (view, update, invite, remove developer with usage retention)
- [x] 14.8 Add tests for usage dashboard API with team-scoped data
- [x] 14.9 Run full test suite: `npm test` — verify all tests pass with zero failures

## 15. Final Verification

- [x] 15.1 Run `npm run build` — verify clean build with no errors
- [x] 15.2 Run lint: `npm run lint` (if lint script exists, else add one) — verify clean
- [x] 15.3 Start dev server: verify Clerk sign-in flow, role-based UI rendering, model browser, API key creation, dashboard
- [x] 15.4 Verify `/v1/models` returns models scoped to API key's team
- [x] 15.5 Verify `/v1/chat/completions` works with API key auth and tracks usage
- [x] 15.6 Verify RTK pool decrements on streaming requests
- [ ] 15.7 Verify docker-compose setup: `docker compose up`, smoke test API
- [ ] 15.8 Verify all branding is Devlens (no remaining 9Router strings in UI or code)
