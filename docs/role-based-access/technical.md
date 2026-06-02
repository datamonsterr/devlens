# Auth and roles

## Dashboard auth

- Clerk protects `/dashboard/*` and management `/api/*`.
- Route handlers resolve Team context from Clerk Organization membership and local `users` row.
- Team context self-heals missing Clerk Organization→Team and Clerk user→local user rows from signed-in Clerk Organization session when webhook creation was missed.
- Clerk membership creation for invited Developer replaces placeholder `invite:*` user with real Clerk user id and sets invite status to `onboarded`.
- `/api/team` exposes server-resolved Team context for client role hooks.
- Server checks enforce Manager or Developer permissions.
- Client role checks are presentation only and must read `/api/team`, not only `user.publicMetadata`.
- Next.js Clerk integration keeps `ClerkProvider` inside `<body>`.
- Next.js proxy/middleware matchers include `'/__clerk/(.*)'` after `'/(api|trpc)(.*)'` when matcher config exists.
- Next.js 15+ server auth calls use `await auth()`.

## API auth

- `/v1/*` and `/v1beta/*` use `Authorization: Bearer <api-key>`.
- API Key validation uses HMAC hash lookup.
- Auth returns `teamId`, `userId`, `role`, `apiKeyId`.

## Role rules

- Manager: Team configuration and analytics; no default `/v1/*` use.
- Developer: API usage and own dashboard; no Team configuration.

## Removal

Remove JWT/password auth, `auth_token`, password settings, and legacy auth routes.
