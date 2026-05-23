# Auth and roles

## Dashboard auth

- Clerk protects `/dashboard/*` and management `/api/*`.
- Route handlers resolve Team context from Clerk Organization membership and local `users` row.
- Server checks enforce Manager or Developer permissions.
- Client role checks are presentation only.

## API auth

- `/v1/*` and `/v1beta/*` use `Authorization: Bearer <api-key>`.
- API Key validation uses HMAC hash lookup.
- Auth returns `teamId`, `userId`, `role`, `apiKeyId`.

## Role rules

- Manager: Team configuration and analytics; no default `/v1/*` use.
- Developer: API usage and own dashboard; no Team configuration.

## Removal

Remove JWT/password auth, `auth_token`, password settings, and legacy auth routes.
