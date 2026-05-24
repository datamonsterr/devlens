## Why

Cloudflare quick tunnels cannot run in Vercel serverless/runtime environments, but the Endpoint page still presents local tunnel controls and copy that imply cloudflared can be started from Vercel. Managers need a stable Team endpoint experience that uses the deployed Vercel URL for `/v1/*` API access when running on Vercel.

## What Changes

- Detect Vercel runtime endpoint mode and treat the deployed Vercel URL as the public API endpoint.
- Hide or disable local Cloudflare quick tunnel enable/disable flows on Vercel.
- Update Endpoint page copy/status so Managers and Developers see Vercel-compatible API endpoint guidance instead of local tunnel setup prompts.
- Preserve local development behavior where Managers can enable Cloudflare quick tunnels for remote access.
- Preserve API key and security guidance for `/v1/*` access.

## Capabilities

### New Capabilities
- `vercel-team-endpoint`: Team endpoint behavior for Vercel deployments, including public endpoint resolution and dashboard presentation.

### Modified Capabilities
- `dashboard-navigation-cleanup`: Endpoint surface remains available, but Vercel deployments must expose it as deployed URL-based API access rather than local Cloudflare quick tunnel controls.

## Impact

- Endpoint dashboard UI: `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`
- Tunnel API routes: `src/app/api/tunnel/status/route.js`, `src/app/api/tunnel/enable/route.js`, `src/app/api/tunnel/disable/route.js`
- Tunnel service: `src/lib/tunnel/tunnelManager.js`
- Unit tests around Vercel endpoint status and Endpoint page behavior
- Living specs for Team endpoint behavior
