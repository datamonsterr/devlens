## 1. Tailscale removal — delete standalone source files

- [x] 1.1 Delete `src/lib/tunnel/tailscale.js` (791 lines, full Tailscale integration)
- [x] 1.2 Delete `src/app/api/tunnel/tailscale-check/route.js`
- [x] 1.3 Delete `src/app/api/tunnel/tailscale-install/route.js`
- [x] 1.4 Delete `src/app/api/tunnel/tailscale-login/route.js`
- [x] 1.5 Delete `src/app/api/tunnel/tailscale-enable/route.js`
- [x] 1.6 Delete `src/app/api/tunnel/tailscale-disable/route.js`
- [x] 1.7 Delete `src/app/api/tunnel/tailscale-start-daemon/route.js`
- [x] 1.8 Run `npm run build` to verify no remaining imports reference deleted files; fix any build errors (deferred — build hangs, verify at end)

## 2. Tailscale removal — strip references from shared modules

- [x] 2.1 Remove `enableTailscale`, `disableTailscale`, `getTailscaleStatus` methods and all tailscale imports from `src/lib/tunnel/tunnelManager.js`; keep `enableTunnel`, `disableTunnel`, `getTunnelStatus` for cloudflared
- [x] 2.2 Remove `TAILSCALE_PID_FILE` constant and tailscale PID tracking from `src/lib/tunnel/state.js`
- [x] 2.3 Remove tailscale auto-resume calls from `src/shared/services/initializeApp.js`
- [x] 2.4 Remove `tailscaleEnabled` and `tailscaleUrl` from settings defaults in `src/lib/db/repos/settingsRepo.js`
- [x] 2.5 Remove tailscale status fields from `src/app/api/tunnel/status/route.js`
- [x] 2.6 Remove `tailscaleUrl` from `src/app/api/settings/require-login/route.js` response
- [x] 2.7 Run `npm run build` to verify shared modules compile without tailscale references (deferred — build hangs, verify at end)

## 3. Tailscale removal — clean UI components

- [x] 3.1 Remove all tailscale install, login, enable/disable, health ping, and security warning UI from `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`
- [x] 3.2 Remove `tailscaleEnabled`, `tailscaleUrl` props and wiring from `src/app/(dashboard)/dashboard/cli-tools/[toolId]/ToolDetailClient.js`
- [x] 3.3 Remove tailscale URL option from `src/app/(dashboard)/dashboard/cli-tools/components/BaseUrlSelect.js`
- [x] 3.4 Remove tailscale URL matching from `src/app/(dashboard)/dashboard/cli-tools/components/cliEndpointMatch.js`
- [x] 3.5 Remove `tailscaleEnabled`/`tailscaleUrl` props from all 13 CLI tool card components: ClaudeToolCard, OpenCodeToolCard, CodexToolCard, CopilotToolCard, CoworkToolCard, ClineToolCard, DroidToolCard, HermesToolCard, DeepSeekTuiToolCard, JcodeToolCard, KiloToolCard, OpenClawToolCard, and any others under `src/app/(dashboard)/dashboard/cli-tools/components/`
- [x] 3.6 Run `npm run build` and verify UI compiles clean (deferred — build hangs, verify at end)

## 4. Proxy pools removal — delete standalone files

- [x] 4.1 Delete `src/lib/db/repos/proxyPoolsRepo.js`
- [x] 4.2 Delete `src/app/api/proxy-pools/route.js`
- [x] 4.3 Delete `src/app/api/proxy-pools/[id]/route.js`
- [x] 4.4 Delete `src/app/api/proxy-pools/[id]/test/route.js`
- [x] 4.5 Delete `src/app/api/proxy-pools/vercel-deploy/route.js`
- [x] 4.6 Delete `src/app/api/proxy-pools/cloudflare-deploy/route.js`
- [x] 4.7 Delete `src/app/(dashboard)/dashboard/proxy-pools/` directory (page and any child components)
- [x] 4.8 Run `npm run build` to verify no remaining imports reference deleted files; fix any build errors

## 5. Proxy pools removal — strip references from shared modules

- [x] 5.1 Remove `proxyPools` table definition and indexes from `src/lib/db/schema.js`
- [x] 5.2 Remove all proxy pool function exports (`getProxyPools`, `getProxyPoolById`, `createProxyPool`, `updateProxyPool`, `deleteProxyPool`) from `src/lib/db/index.js`
- [x] 5.3 Remove proxy pool re-exports from `src/lib/localDb.js`
- [x] 5.4 Remove proxy pool re-exports from `src/models/index.js`
- [x] 5.5 Remove proxy pool resolution logic from `src/lib/network/connectionProxy.js`; simplify to use connection-level proxy config only
- [x] 5.6 Run `npm run build` to verify shared modules compile without proxy pool references

## 6. Proxy pools removal — clean UI components

- [x] 6.1 Remove proxy pool dropdown and references from `src/app/(dashboard)/dashboard/providers/[id]/ConnectionRow.js`
- [x] 6.2 Remove proxy pool selection from `src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js`
- [x] 6.3 Remove proxy pool references from provider connection page at `src/app/(dashboard)/dashboard/providers/[id]/page.js`
- [x] 6.4 Remove proxy pool references from usage components under `src/app/(dashboard)/dashboard/usage/`
- [x] 6.5 Run `npm run build` and verify UI compiles clean

## 7. Dead code cleanup — delete unused files

- [x] 7.1 Delete `open-sse/translator/request/openai-to-kiro.old.js`
- [x] 7.2 Find all API routes importing from `@/lib/disabledModelsDb`; replace imports with direct `@/lib/db` imports; delete `src/lib/disabledModelsDb.js`
- [x] 7.3 Find all API routes importing from `@/lib/usageDb`; replace imports with direct `@/lib/db` imports; delete `src/lib/usageDb.js`
- [x] 7.4 Find all API routes importing from `@/lib/requestDetailsDb`; replace imports with direct `@/lib/db` imports; delete `src/lib/requestDetailsDb.js`

## 8. Verification — build, lint, and scan

- [x] 8.1 Run `npm run build` — full Next.js production build must succeed with zero errors
- [x] 8.2 Run `npm run lint` and inspect output for zero errors despite script `|| true` (passes with existing warnings only); if available, run ESLint directly without forced success
- [x] 8.3 Run `grep -r "tailscale" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"` and confirm zero matches
- [x] 8.4 Run `grep -r "proxyPools\|proxy-pools\|proxyPool\|proxy_pool" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"` and confirm zero matches (excluding `connectionProxy.js` which must not reference pools)
- [x] 8.5 Run `grep -r "disabledModelsDb\|usageDb\|requestDetailsDb" src/ --include="*.js" --include="*.jsx"` and confirm zero matches
- [x] 8.6 Run `grep -r "openai-to-kiro.old" src/ open-sse/` and confirm zero matches
- [x] 8.7 Commit all changes and push branch for PR (user requested PR instead of push to main)
