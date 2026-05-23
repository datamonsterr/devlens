## Context

Devlens currently runs a dual-provider tunnel system: cloudflared (Cloudflare Quick Tunnels) and tailscale (Tailscale Funnel). The proxy pools feature was added pre-launch but never adopted. Several dead files and redundant DB shim layers accumulated during rapid development. Removing these reduces codebase weight, simplifies the tunnel architecture, and eliminates unused UI surface.

Current tunnel architecture:
- `tunnelManager.js` orchestrates both providers via enable/disable methods
- `cloudflared.js` spawns `cloudflared` binary, parses quick-tunnel URL, handles health checks
- `tailscale.js` spawns `tailscale`/`tailscaled` binaries, handles install, daemon, login, funnel cert provisioning
- `state.js` tracks PIDs and URLs for both providers
- `initializeApp.js` auto-resumes both providers on app restart
- Settings defaults hold `tailscaleEnabled: false`, `tailscaleUrl: ""` alongside cloudflared settings
- Endpoint dashboard UI shows separate enable/disable toggles for both providers
- All 13 CLI tool cards receive `tailscaleEnabled` + `tailscaleUrl` + `tunnelEnabled` + `tunnelPublicUrl` props

Current proxy pools architecture:
- `proxyPoolsRepo.js` — standard CRUD repo for `proxyPools` SQLite table
- `schema.js` — defines `proxyPools` table with indexes on name, isActive
- 5 API routes — list/create, get/update/delete, test, vercel-deploy, cloudflare-deploy
- Dashboard page at `/dashboard/proxy-pools` with full management UI
- `connectionProxy.js` resolves proxy config per connection by checking pool > legacy
- Provider connection editing UI renders proxy pool dropdown per connection
- Usage components reference proxy pool data

Dead code:
- `openai-to-kiro.old.js` (278 lines) — zero imports across codebase; leftover backup
- `disabledModelsDb.js`, `usageDb.js`, `requestDetailsDb.js` — thin re-export shims (4-7 lines each) that add an unnecessary import indirection layer

## Goals / Non-Goals

**Goals:**
- Delete all tailscale source files, API routes, and UI components
- Strip tailscale methods, state tracking, settings defaults, and auto-resume hooks from shared modules
- Preserve cloudflared tunnel fully intact — no behavior change to tunnel/enable, tunnel/disable, tunnel/status routes
- Delete all proxy pool source files, API routes, dashboard page, and DB schema entries
- Strip proxy pool resolution from connectionProxy; remove proxy pool UI from provider/usage components
- Delete `openai-to-kiro.old.js`
- Replace shim imports with direct `@/lib/db` imports in all 13 consumer API routes, then delete the 3 shim files
- Verify build passes with `npm run build` and lint with `npm run lint` after all changes

**Non-Goals:**
- Do not change cloudflared tunnel implementation or behavior
- Do not add new features or providers
- Do not run database migrations on existing data (schema changes are additive for new installs only — existing proxy pool rows are inert)
- Do not modify `open-sse/` beyond deleting the dead `.old.js` file
- Do not touch agent skills (`.agents/skills/`, `skills/`), tester tools, or `gitbook/`

## Decisions

### D1: Keep cloudflared, remove tailscale

**Rationale**: Cloudflared quick tunnels require no account, no install step, no login flow, and no daemon management. They produce a URL immediately on enable. Tailscale requires installation, login, daemon management, funnel enable, cert provisioning — all orchestrated by 791 lines of JS. Cloudflared is simpler and fully sufficient for developer connectivity.

**Alternatives considered**: Keep both providers. Rejected — adds maintenance burden for a feature redundant with cloudflared. Remove both. Rejected — developers need a tunnel solution; cloudflared is working and adopted.

### D2: Top-down deletion order: files → shared modules → UI

**Rationale**: Delete standalone files and API routes first (no dependencies on them elsewhere except imports). Then strip imports and method calls from shared modules (tunnelManager, state.js, settings, initializeApp). Then clean UI components (endpoint page, CLI tool cards). This prevents broken states where shared modules reference deleted functions.

**Alternatives considered**: Bottom-up (UI first). Rejected — shared module references would break mid-change. All-at-once. Rejected — too risky to verify in one step.

### D3: Shim consolidation via direct import replacement

**Rationale**: The 3 shim files (`disabledModelsDb.js`, `usageDb.js`, `requestDetailsDb.js`) each do `export { X } from '@/lib/db'`. Their 13 consumer files should import directly from `@/lib/db` instead. No logic changes, just import path updates.

**Alternatives considered**: Keep shims. Rejected — unnecessary indirection layer. Create a single unified shim. Rejected — still adds an unnecessary layer; direct imports are cleaner.

### D4: No DB migration for proxy pools schema removal

**Rationale**: The `proxyPools` table definition in `schema.js` is only used for table creation (`CREATE TABLE IF NOT EXISTS`). Removing it from schema means new installs won't create the table. Existing installs with rows in `proxyPools` will have an inert orphan table — no queries touch it after repo deletion. No migration needed.

**Alternatives considered**: Write a migration to drop the table on existing installs. Rejected — overkill for a pre-launch feature with likely zero real data; the table is harmless.

## Risks / Trade-offs

- **Risk**: Existing users actively using tailscale will lose connectivity → **Mitigation**: Cloudflared remains and is the documented path; tailscale was always optional and default-disabled (`tailscaleEnabled: false` in settings defaults)
- **Risk**: Orphan imports from deleted files cause build failures → **Mitigation**: Run `npm run build` after each batch; use grep to verify no remaining references to deleted files
- **Risk**: Deleting API routes could 404 for any external callers → **Mitigation**: These are dashboard-only routes behind Clerk auth; not part of the public `/v1/*` API
- **Risk**: Proxy pool references in connectionProxy could break provider connections → **Mitigation**: `connectionProxy.js` already falls back to legacy proxy config when no pool is assigned; removing pool lookup simplifies to always use legacy config
- **Risk**: UI state drift — React components expecting tailscale/proxy pool props that are no longer passed → **Mitigation**: Clean props top-down through ToolDetailClient → all child cards; verify no prop-type warnings in console
