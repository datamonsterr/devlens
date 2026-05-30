# Bugs Found During Manual Testing

## BUG-1: SQLite cannot commit - no transaction is active (CRITICAL) — FIXED

**Error**: `SQLITE_UNKNOWN: SQLite error: cannot commit - no transaction is active`

**Severity**: CRITICAL — all DB transactions broken on Turso

**Trigger**: Any `db.transaction()` call when using Turso/libSQL backend. Most visible with `POST /api/tunnel/enable` → calls `updateSettings()` → `db.transaction()` → `COMMIT` fails.

**Root Cause**: `src/lib/db/adapters/libsqlAdapter.js:66-78`

The `libsqlAdapter` implements transactions using `BEGIN`/`COMMIT` with separate `client.execute()` calls. The `@libsql/client` sends each `execute()` as a **separate HTTP request** with a new `HttpStream` → new server connection. `BEGIN` starts a transaction on connection A, but `COMMIT` arrives on connection D. Turso: "no transaction is active on this connection."

**Impact**: All 17 transaction blocks across 9 repo files are broken on Turso:
- `settingsRepo.updateSettings()` — tunnel enable/disable, settings PATCH
- `usageRepo.saveRequestUsage()` — 3 writes not atomic
- `connectionsRepo.create/update/delete/reorderConnection()` — not atomic
- `nodesRepo.updateProviderNode()` — read-merge-upsert not atomic
- `apiKeysRepo.updateApiKey()` — read-merge-update not atomic
- `combosRepo.updateCombo()` — read-merge-update not atomic
- `pricingRepo.updatePricing/resetPricing()` — pricing merge not atomic
- `disabledModelsRepo.disableModels/enableModels()` — array merge not atomic
- `requestDetailsRepo.flushToDatabase()` — batch insert not atomic

**Fix**: Use `@libsql/client`'s built-in `client.transaction("write")` API. Modified `execute()` to route through `txStorage.getStore()` (HttpTransaction) instead of raw `client.execute()`. The HttpTransaction shares a single HttpStream across all statements.

**Fix applied** in `src/lib/db/adapters/libsqlAdapter.js`. Verified with standalone tests:
- Create table → INSERT 2 rows → SELECT → COMMIT → verify both rows persisted
- Adapter integration test: run → get → transaction(insert×2) → all → 3 rows confirmed

**Verification**: No SQLite errors in server logs after 100+ API requests across all modules.

---

## BUG-2: Tunnel enable hangs for 3 minutes on health probe (HIGH)

**Root Cause**: `src/lib/tunnel/tunnelManager.js` calls `waitForHealth(publicUrl, token)` after spawning cloudflared. `networkProbe.js` polls `https://r{shortId}.abc-tunnel.us/api/health` with `timeoutMs: 180000` (3 min). If the worker URL is unreachable, the entire `POST /api/tunnel/enable` request blocks for 3 minutes.

**Fix**: Reduce health probe timeout to 30s. Return intermediate response with `pending: true` if probe hasn't completed. Or make health probe non-blocking — return `success: true` immediately after spawn, let health check run async.

---

## BUG-3: `auth_token` cookie not read in Next.js proxy mode (HIGH)

**Root Cause**: `src/middleware.ts:30` reads `process.env.JWT_SECRET`. The `dashboardSession.js`'s `loadJwtSecret()` falls back to file-based `~/.devlens/jwt-secret`. When only the file exists (not env var), middleware returns `false` from `hasDashboardSession()`, triggers `auth.protect()`, rewrites to 404 HTML.

Also: `cookies()` from `next/headers` fails to read `auth_token` in proxy mode. Route handlers call `cookies().get("auth_token")` which returns `undefined`, causing `getLocalDevContext()` to fail with "Team context not found".

**Fix**: Sync middleware `hasDashboardSession()` to use same `loadJwtSecret()` logic as `dashboardSession.js`. Or always set `JWT_SECRET` as env var.

---

## BUG-4: Protected routes return 404 HTML instead of 401/403 JSON (MEDIUM)

**Root Cause**: `src/middleware.ts:58` — Clerk's `auth.protect()` in dev mode rewrites to `/clerk_<timestamp>` interstitial that doesn't exist, producing 404 HTML page. API clients receive HTML instead of JSON error.

**Impact**: All non-public API routes return confusing 404 HTML when unauthenticated. Tested on: `/api/providers`, `/api/combos`, `/api/models`, `/api/keys`, `/api/settings`.

**Fix**: Add proper unauthorized middleware handler that returns JSON: `NextResponse.json({error:"Unauthorized"}, {status:401})`.

---

## BUG-5: Duplicate provider connection name silently UPSERTs (HIGH)

**File**: `src/lib/db/repos/connectionsRepo.js:118-127`

Creating connection with same `(provider, name, authType)` silently merges into existing record, **overwriting the API key**. No 409 Conflict. User may accidentally overwrite credentials.

**Fix**: Return `409 Conflict` with message "Connection with this name already exists" instead of silent merge. Add DB-level unique constraint on `(teamId, provider, name)`.

---

## BUG-6: DELETE API key returns success for non-existent IDs (MEDIUM)

**File**: `src/app/api/keys/[id]/route.js:42-47`

`db.run("DELETE FROM apiKeys WHERE id = ?")` does not check `affectedRows`. Deleting non-existent key returns `{"success":true}`.

**Fix**: Check `result.changes > 0`, return 404 if no rows affected.

---

## BUG-7: Soft-deleted (inactive) API keys appear in GET list (MEDIUM)

**File**: `src/app/api/keys/route.js:24`

Developer GET returns all keys regardless of `isActive`. Inactive (revoked/rotated) keys appear in the list and single-key view.

**Fix**: Add `WHERE isActive = 1` filter for developer GET. Manager GET may want to show all.

---

## BUG-8: API key rotate endpoint missing (MEDIUM)

`POST /api/keys/[id]/rotate` returns `404 {"error":"Key not found"}` — no route handler exists.

**File exists**: `src/app/api/keys/[id]/rotate/route.js` but returns wrong error for missing key. Tested with valid key ID — route handler was not invoked (404 from Next.js, not route handler).

**Fix**: Verify `rotate/route.js` exports correct handler and is reachable at the expected URL path.

---

## BUG-9: No API key name length validation (LOW)

300-character key names accepted. Only check is "name is required". No max length enforcement.

**Fix**: Add max length validation (e.g., 100 chars) at route level or schema level.

---

## BUG-10: Empty/invalid JSON body on settings PATCH returns 500 (LOW)

`PATCH /api/settings` with empty body → `500 {"error":"Unexpected end of JSON input"}`. Should be `400 Bad Request`.

**Fix**: Add body validation before JSON.parse(), return 400 for invalid input.

---

## BUG-11: `Response` thrown instead of `Error` silences error messages (MEDIUM)

**File**: `src/lib/auth/teamContext.js:124,134`

`requireTeamContext()` throws `new Response(...)` not `new Error(...)`. Route handlers catch `error.message` which is `undefined` on Response objects → empty `{"error": undefined}` in 500 responses.

**Fix**: Either check `error instanceof Response` before accessing `.message`, or throw actual Error objects with proper messages.

---

## BUG-12: Tunnel state inconsistency after server restart (MEDIUM)

After server restart: `settingsEnabled: true`, `running: false`, `enabled: false` with stale `tunnelUrl`. Cloudflared process died on restart but DB `tunnelEnabled` flag persisted.

**Fix**: On app startup (`initializeApp.js`), check `isCloudflaredRunning()`. If `tunnelEnabled=true` but process dead, either auto-resume tunnel or clear `tunnelEnabled=false` in DB.

---

## BUG-13: Unregistered migration files (LOW)

Three files exist but NOT registered in `migrations/index.js`:
- `006-add-teamid-userid-to-requestdetails.js` (version 6, duplicates)
- `007-backfill-requestdetails-teamid-userid.js` (version 7)
- `008-team-scoped-usage-daily.js` (version 8)

`SCHEMA_VERSION` is `6`, so these never run.

**Fix**: Register or delete them.

---

## BUG-14: libsqlAdapter serialize() queue swallows errors silently (LOW)

**File**: `libsqlAdapter.js:46` — `queue = next.catch(() => {});`

Swallows all rejections silently. Transaction failures consumed, making root-cause diagnosis harder.

**Fix**: Log at debug level: `queue = next.catch(err => console.debug("[DB] queue error:", err?.message));`

---

## BUG-15: `writeAuditLog` failures silently swallowed (LOW)

All audit log writes in route handlers use fire-and-forget `.catch(() => {})`. No retry, no log, no alert.

**Fix**: Log audit failures at warn level.

---

## BUG-16: Vercel deployment returns wrong project (MEDIUM)

`curl https://devlens.vercel.app/api/health` returns 404 "GitHub Profile Analyzer" page. Wrong project deployed or deployment URL changed.

**Fix**: Verify correct project is deployed to the correct Vercel URL.

---

## VERIFIED WORKING CORRECTLY

These modules and operations were tested and function correctly (with valid auth):

| Module | Operations Tested | Status |
|--------|-------------------|--------|
| API Keys | List, Create, Get by ID, Delete, Duplicate detection, Empty name rejection | PASS |
| Combos | List, Create, Duplicate detection, Empty name rejection, Special char rejection | PASS |
| Settings | GET, PATCH, Concurrent updates (5 rapid-fire, no lost writes), Field persistence | PASS |
| Tunnel | Status (valid response), Enable (spawns cloudflared), Disable (cleans up) | PASS |
| Tunnel | cloudflared spawned with correct URL | PASS |
| DB Transactions | 100+ requests, 0 SQLite errors | PASS (after fix) |
| Provider Connections | POST route handler (blocked by auth middleware for testing, but handler logic verified) | PENDING AUTH |

---

## SUMMARY TABLE

| # | Severity | Module | Root Cause | Fix Verified |
|---|----------|--------|-----------|--------------|
| 1 | CRITICAL | DB adapter | Turso HTTP: each execute() = new connection, breaks BEGIN/COMMIT | YES |
| 2 | HIGH | Tunnel | waitForHealth() blocks 180s on unreachable URL | NO |
| 3 | HIGH | Auth | Middleware JWT secret source differs from route handler | NO |
| 4 | MEDIUM | Auth | Clerk protect() rewrites to 404 HTML instead of 401 JSON | NO |
| 5 | HIGH | Providers | Duplicate name silently UPSERTs, overwrites API keys | NO |
| 6 | MEDIUM | API Keys | DELETE no affectedRows check → false success | NO |
| 7 | MEDIUM | API Keys | Soft-deleted keys appear in GET list | NO |
| 8 | MEDIUM | API Keys | Rotate endpoint returns wrong error / unreachable | NO |
| 9 | LOW | API Keys | No max length validation on key name | NO |
| 10 | LOW | Settings | Empty body = 500 instead of 400 | NO |
| 11 | MEDIUM | Auth | Response thrown instead of Error → silent errors | NO |
| 12 | MEDIUM | Tunnel | Stale state after restart (DB flag vs process check) | NO |
| 13 | LOW | DB | Unregistered migrations never run | NO |
| 14 | LOW | DB | Queue swallows errors silently | NO |
| 15 | LOW | Audit | Audit failures silently swallowed | NO |
| 16 | MEDIUM | Deployment | Vercel serves wrong project (GitHub Profile Analyzer) | NO |

---

## BUG-17: RTK pool endpoint accessible by developers (MEDIUM) — FIXED

**File**: `src/app/api/team/rtk-pool/route.js:9`
GET handler uses `requireTeamContext()` without role check. Developers can see team RTK pool balance and history.
PUT handler already has `assertManager()` — only GET was missing.

**Fix**: Added `await assertManager()` before `requireTeamContext()` in GET handler.

---

## BUG-18: Empty provider name accepted (LOW) — FIXED

**File**: `src/app/api/providers/route.js:100`
Validation only checks `if (!connectionName)`, but `"" || displayName || AI_PROVIDERS[provider]?.name` falls through to the default name. Explicit `name=""` was silently replaced.

**Fix**: Added explicit check: `if (typeof name === "string" && name.trim() === "")` returning 400 before the fallback chain.
