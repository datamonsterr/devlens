# API route map

## Public app routes

- `/`: landing or redirect.
- `/sign-in`: Clerk sign-in.
- `/onboarding/manager`: Team creation.
- `/onboarding/developer`: Team join flow.

## Dashboard routes

- `/dashboard`: role-aware home.
- `/dashboard/team`: Manager Team management, Developer invite status, assigned API Key metadata/copy controls.
- `/teams`: legacy Team management alias redirecting to `/dashboard/team`.
- `/dashboard/providers`: Manager Provider Connections.
- `/dashboard/combos`: Manager Combos.
- `/dashboard/pricing`: Manager Pricing Overrides.
- `/dashboard/rtk-pool`: Manager RTK Pool.
- `/dashboard/models`: Manager/Developer Model Browser.
- `/dashboard/keys`: Developer API Keys and API access view with base URL copy; Manager redirects to Team management.
- `/dashboard/usage`: role-filtered analytics.
- `/dashboard/cli-config`: CLI Config Snippets (aliased to `/dashboard/cli-tools` with redirect).
- `/dashboard/console-log`: role-filtered sanitized logs.
- `/dashboard/endpoint`: Team API endpoint. Local deployments can expose Cloudflared endpoint; Vercel deployments use the deployed Vercel URL.
- `/dashboard/profile`: profile/settings surface opened from HeaderMenu/account menu, not standalone sidebar module.

## Management API

- `/api/team`: server-resolved Team context for signed-in Clerk Organization session.
- `/api/tunnel/status`: signed-in Team context can read endpoint status. On Vercel, returns deployed public endpoint and `unsupported: true` for quick tunnel process behavior; locally, returns Cloudflared tunnel status.
- `/api/tunnel/enable`: Manager refreshes/enables local Cloudflared tunnel URL. On Vercel, returns unsupported result with deployed public endpoint and does not spawn `cloudflared`.
- `/api/tunnel/disable`: Manager disables local Cloudflared tunnel. On Vercel, returns unsupported result with deployed public endpoint and does not stop `cloudflared`.

## Public status API

- `/status`: unauthenticated CORS health check returning `{ ok: true }`.

## Compatibility API

- `/v1/*`: OpenAI-compatible Team-routed API.
- `/v1beta/*`: compatibility retained for MVP.

## Removed routes

- MITM routes.
- Cloud sync routes.
- Tailscale routes.
- Proxy Pool routes.
- CLI auto-config writer/checker routes.
