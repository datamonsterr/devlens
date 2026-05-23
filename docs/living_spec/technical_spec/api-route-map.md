# API route map

## Public app routes

- `/`: landing or redirect.
- `/sign-in`: Clerk sign-in.
- `/onboarding/manager`: Team creation.
- `/onboarding/developer`: Team join flow.

## Dashboard routes

- `/dashboard`: role-aware home.
- `/dashboard/team`: Manager Team management.
- `/dashboard/providers`: Manager Provider Connections.
- `/dashboard/combos`: Manager Combos.
- `/dashboard/pricing`: Manager Pricing Overrides.
- `/dashboard/rtk-pool`: Manager RTK Pool.
- `/dashboard/models`: Manager/Developer Model Browser.
- `/dashboard/api-keys`: Developer API Keys; Manager metadata/revocation.
- `/dashboard/usage`: role-filtered analytics.
- `/dashboard/cli-config`: CLI Config Snippets.
- `/dashboard/console-log`: role-filtered sanitized logs.
- `/dashboard/endpoint`: Team cloudflared endpoint.

## Management API

- `/api/team`: server-resolved Team context for signed-in Clerk Organization session.

## Compatibility API

- `/v1/*`: OpenAI-compatible Team-routed API.
- `/v1beta/*`: compatibility retained for MVP.

## Removed routes

- MITM routes.
- Cloud sync routes.
- Tailscale routes.
- Proxy Pool routes.
- CLI auto-config writer/checker routes.
