## Why

Tailscale integration, proxy pools, and several dead/unused modules add unnecessary code weight, maintenance burden, and UI complexity. Cloudflared tunnels already provide developer connectivity — Tailscale is redundant. Proxy pools were never adopted as a feature. Dead files and redundant shim layers clutter the codebase. Removing them simplifies the platform, reduces attack surface, and makes future changes faster.

## What Changes

- Remove Tailscale tunnel provider entirely — delete `src/lib/tunnel/tailscale.js` and 6 API routes; strip tailscale methods from tunnelManager, state, settings, and app init; clean all tailscale UI from endpoint page and CLI tool cards
- Remove proxy pools module — delete repo, 5 API routes, dashboard page, and schema entries; strip proxy pool resolution from connection proxy resolver; clean proxy pool references from provider connection UI and usage components
- Remove dead translation file `open-sse/translator/request/openai-to-kiro.old.js` (278 lines, zero imports)
- Consolidate redundant DB shim files — `src/lib/disabledModelsDb.js`, `src/lib/usageDb.js`, `src/lib/requestDetailsDb.js` — into direct `@/lib/db` imports in consuming API routes
- Keep cloudflared tunnel (tunnelManager, cloudflared.js, tunnel/status, tunnel/enable, tunnel/disable, state.js PIDs, endpoint UI for cloudflared) fully intact
- Verify no orphan imports or broken references remain after removal

## Capabilities

### New Capabilities

- `tailscale-removal`: Remove Tailscale tunnel provider — delete source files, API routes, settings defaults, UI components, and app initialization hooks. Cloudflared tunnel remains the single developer connectivity provider. Manager no longer sees tailscale install/login/enable options in endpoint dashboard. CLI tool cards no longer receive tailscale URL or tailscaleEnabled props. Settings schema drops `tailscaleEnabled` and `tailscaleUrl` fields.
- `proxy-pools-removal`: Remove proxy pools feature — delete DB repository, schema table, 5 API routes, dashboard page, and all UI integrations. Connection proxy resolver drops pool-based proxy selection. Provider connection editing no longer shows proxy pool dropdown. Vercel/Cloudflare deploy buttons removed.
- `dead-code-cleanup`: Remove unused files and consolidate redundant shim layers. Delete `openai-to-kiro.old.js`. Replace `disabledModelsDb.js`, `usageDb.js`, `requestDetailsDb.js` imports with direct `@/lib/db` calls in their 13 consumer files.

### Modified Capabilities

None — this change only removes unused code, no spec-level behavior changes.

## Impact

- **Deleted files**: `src/lib/tunnel/tailscale.js`, 6 tailscale API routes (`src/app/api/tunnel/tailscale-*`), `src/lib/db/repos/proxyPoolsRepo.js`, 5 proxy pool API routes (`src/app/api/proxy-pools/*`), dashboard proxy pools page (`src/app/(dashboard)/dashboard/proxy-pools/`), `open-sse/translator/request/openai-to-kiro.old.js`, 3 DB shim files (`disabledModelsDb.js`, `usageDb.js`, `requestDetailsDb.js`)
- **Modified files**: `src/lib/tunnel/tunnelManager.js`, `src/lib/tunnel/state.js`, `src/shared/services/initializeApp.js`, `src/lib/db/repos/settingsRepo.js`, `src/app/api/tunnel/status/route.js`, `src/app/api/settings/require-login/route.js`, `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`, `src/app/(dashboard)/dashboard/cli-tools/[toolId]/ToolDetailClient.js`, `src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js`, `src/app/(dashboard)/dashboard/cli-tools/components/cliEndpointMatch.js`, all 13 CLI tool card components, `src/lib/db/schema.js`, `src/lib/db/index.js`, `src/lib/localDb.js`, `src/models/index.js`, `src/lib/network/connectionProxy.js`, provider connection UI files, usage components, and 13 API route files that consume shim imports
- **Dependencies**: No npm dependency changes — Tailscale integration uses spawned CLI binaries only
- **Tests**: Run full test suite after removal to catch orphan imports or broken references
