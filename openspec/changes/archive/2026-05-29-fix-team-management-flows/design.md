## Context

The team management flows were implemented with a Clerk-first architecture. All invitation, onboarding, and membership management routes in `src/app/api/team/members/route.js` depend on `CLERK_SECRET_KEY` to call `api.clerk.com/v1/organizations/{orgId}/invitations`. In local development, Clerk keys are placeholder values (`test_*`), causing the Clerk API call to fail with 401 — blocking the entire invite flow.

Usage tracking has two competing paths for streaming responses:
1. `logUsage` (in-stream, in `open-sse/utils/usageTracking.js:345`) — called from the SSE transform stream, **does not pass teamId/userId**.
2. `saveUsageStats` (post-stream, in `requestDetail.js:77`) — called from `onStreamComplete` callback, **correctly passes authContext**.

This means streaming requests produce two `usageHistory` rows: one with correct team/user attribution (from `saveUsageStats`) and one with NULLs (from `logUsage`). Both paths also independently call `saveRequestUsage` which upserts `usageDaily` — the NULL-attributed row corrupts the daily aggregate for any day where usage is tracked.

Performance: `usageHistory` has no index on `(teamId, userId)` or `(timestamp)`. The table is queried with `WHERE teamId = ? AND userId = ? AND timestamp >= ?` patterns across analytics, member detail, and logs endpoints. Full table scans will become unacceptable with real usage volume.

Sidebar visibility of Team Management links is conditional on Clerk role resolution, which is unreliable in local dev even after the `useRole` hook fix.

## Goals / Non-Goals

**Goals:**
- Make the full Manager → Developer → usage demo work end-to-end in local dev without Clerk API keys.
- Make `POST /api/team/members` resilient to Clerk failures in dev mode — wrap Clerk API call in try/catch, continue with local user creation when Clerk is unavailable.
- Generate a separate developer dashboard password during dev invite (alongside API key), reuse existing `POST /api/auth/login` for dashboard auth.
- Make `logUsage` console-only (remove its `saveRequestUsage` DB write path).
- Add database indexes on `usageHistory(teamId, userId)`, `usageHistory(timestamp)`, `requestDetails(teamId, userId)`.
- Create a demo seed script that reuses internal server-side services (not raw SQL, not HTTP) to populate realistic usage data.
- Add 30-second auto-refresh to analytics page.
- Ensure sidebar shows Team Management links consistently using local dev context.
- Set up a git worktree for safe implementation.

**Non-Goals:**
- Replacing the Clerk production invitation flow.
- Adding multi-team membership.
- Adding real email delivery (webhook-based onboarding email on by default with graceful skip).
- Adding real-time WebSocket push to the frontend (polling is acceptable for MVP).

## Decisions

1. **Make existing `POST /api/team/members` dev-resilient, not a separate route.**
   - Wrap the Clerk Organization invitation call in try/catch.
   - In dev mode (`ALLOW_LOCAL_INVITES=true` flag), catch Clerk errors and continue with local user creation.
   - Log a warning when Clerk fallback is used.
   - Reuses all existing validation, RBAC, API key generation, and email handling.
   - Alternative considered: separate `/api/team/invite/dev` route. Rejected because it duplicates invite logic and creates long-term divergence between prod and dev flows.
   - Guard: `ALLOW_LOCAL_INVITES` env var gated behind development mode to prevent accidental production bypass.

2. **Developer dashboard via password, not API key exchange.**
   - During dev invite, generate a separate developer password alongside the API key.
   - Reuse existing `POST /api/auth/login` for dashboard auth (same as manager local login).
   - API keys remain purely for `/v1/*` machine authentication — matches production security model.
   - Alternative considered: exchanging API key for a session cookie. Rejected because it mixes two auth boundaries (machine vs human) and creates a dev-only auth mechanism.

3. **`logUsage` becomes console-only.**
   - Remove the `saveRequestUsage()` call from `logUsage`.
   - `logUsage` retains its console.log for real-time debugging and stream diagnostics.
   - `saveUsageStats` (called from `onStreamComplete`) becomes the sole DB persistence path.
   - Alternative considered: threading teamId/userId through the stream to fix the DB write. Rejected because it's redundant work — `onStreamComplete` always fires and already correctly persists usage.
   - Add stable `requestId` to `saveUsageStats` for future idempotency.

4. **Indexes added via schema v9 migration.**
   - `CREATE INDEX IF NOT EXISTS idx_usageHistory_team_user ON usageHistory(teamId, userId)`
   - `CREATE INDEX IF NOT EXISTS idx_usageHistory_timestamp ON usageHistory(timestamp)`
   - `CREATE INDEX IF NOT EXISTS idx_requestDetails_team_user ON requestDetails(teamId, userId)`
   - Alternative considered: adding indexes directly in schema.js auto-sync. Rejected because schema.js auto-sync only handles table creation, not indexes. A proper migration is safer.

5. **Analytics refresh via polling (not WebSocket).**
   - The overview endpoint responds in <50ms for realistic data volumes.
   - Frontend already has a "Refresh" button in the analytics page.
   - Add auto-refresh every 30 seconds when the page is visible (using `useEffect` with `setInterval` and `visibilitychange`).
   - Alternative considered: Server-Sent Events or WebSocket from `statsEmitter`. Rejected because it adds complexity for marginal UX gain at current scale.

6. **Seed script reuses internal server-side services.**
   - Extracts the invite + API key creation logic from the route handler into a shared module.
   - Seed calls the extracted service functions directly (not HTTP, not raw SQL).
   - Uses `saveRequestUsage()` directly for usage data generation.
   - Alternative considered: direct DB inserts. Rejected because seed data must validate production code paths; direct inserts hide pipeline bugs.

## Risks / Trade-offs

- **`ALLOW_LOCAL_INVITES` must be strictly guarded.** Production must never set this flag. The route checks `NODE_ENV !== 'production'` as a secondary guard.
- **Extracting invite services is prerequisite for seed script.** Adds scope but ensures seed exercises real code paths.
- **Removing `logUsage` DB write eliminates double-write but removes the in-stream persistence safety net.** Acceptable because `onStreamComplete` is guaranteed to fire for all stream outcomes.
- **Seed script must ensure pricing data exists for `calculateCost()`.** Seed pre-populates basic pricing overrides first.

## Migration Plan

1. Add `ALLOW_LOCAL_INVITES` to `.env.example`.
2. Extract invite + API key creation + password generation into shared module.
3. Update `POST /api/team/members` to wrap Clerk in try/catch with dev fallback.
4. Update `POST /api/team/members` response to include developer password in dev mode.
5. Make `logUsage` console-only (remove `saveRequestUsage` call).
6. Create schema migration v9 with the three indexes.
7. Add 30-second auto-refresh to analytics page.
8. Create `scripts/demo-seed.mjs` seed script and add to `package.json`.
9. Set up git worktree, implement, test.
10. Write integration tests.
