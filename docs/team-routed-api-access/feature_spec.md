# Team-routed API access

## Type

New Devlens behavior over preserved `/v1/*` 9router API.

## Purpose

API Key identity determines Team data boundary and Developer usage attribution.

## Requirements

- `/v1/*` validates `Authorization: Bearer <api-key>`.
- Auth resolves Team, Developer, role, API Key id.
- Router uses Team for Provider Connections, Combos, Model Aliases, Pricing Overrides, RTK Pool, and usage writes.
- `/v1/models` and `/v1/models/{kind}` return only models, Combos, and Model Aliases available to the API Key's Team.
- Developer role can call `/v1/*`; Manager dashboard role cannot use `/v1/*` unless also Developer via explicit API Key policy later.
- `/v1beta/*` remains for compatibility.
- Team endpoint shown in dashboard is deployment-mode aware:
  - Vercel deployments use deployed origin plus `/v1` for API clients, resolving origin by `DEVLENS_PUBLIC_API_ENDPOINT`, then `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`.
  - Local deployments can expose a Cloudflare quick tunnel endpoint plus `/v1` when Manager enables remote access.
- Vercel deployments mark Cloudflare quick tunnel process controls unsupported and do not start, stop, download, spawn, or health-check `cloudflared`.
- Local deployments preserve existing Cloudflare quick tunnel status and Manager enable flow.

## 9router change

Keep API surface; add API Key Team context before model/provider resolution. Vercel production replaces local quick tunnel endpoint assumptions with deployed URL endpoint behavior.
