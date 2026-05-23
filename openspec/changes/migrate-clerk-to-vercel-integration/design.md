## Context

Devlens living specs define Clerk auth as the replacement for 9router JWT/password auth. Clerk Organizations map 1:1 to Teams. Managers and Developers authenticate with Clerk sessions for dashboard access, while `/v1/*` and `/v1beta/*` use per-Developer API Keys.

The app dependency list already includes `@clerk/nextjs`, so this is a migration/verification change, not necessarily a new auth implementation. Vercel integrated Clerk should supply the same Clerk environment variables through Vercel deployment configuration. Code changes are only needed where current code does not satisfy Clerk/Next.js requirements or Devlens auth semantics.

A Clerk secret was provided in chat. It must be treated as compromised and rotated. Do not copy real Clerk credentials into committed files, docs, test fixtures, logs, or OpenSpec artifacts.

## Goals / Non-Goals

**Goals:**

- Align Devlens with Vercel integrated Clerk env management
- Link Clerk CLI setup to app `app_3E8lz4sxdjUzfdcfua63yDGDuZy`
- Verify existing Next.js Clerk setup before making changes
- Ensure `ClerkProvider` placement is correct for Next.js App Router
- Ensure dashboard and management APIs require Clerk session auth
- Ensure `/v1/*` keeps API Key auth and does not require Clerk sessions
- Ensure Next.js matcher includes `'/__clerk/(.*)'` when proxy/middleware exists
- Ensure clear sign-in, sign-up, and signed-in user controls exist in app navigation/layout
- Keep real Clerk keys out of committed files
- Run Clerk and app verification commands after setup

**Non-Goals:**

- Do not redesign Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, or CLI Config Snippet semantics
- Do not replace API Key auth for `/v1/*` with Clerk session auth
- Do not commit real `CLERK_SECRET_KEY` or publishable key values
- Do not require Clerk for local API-key-only `/v1/*` requests
- Do not add organization/membership features beyond what is needed to preserve current Team auth direction

## Decisions

### D1: Vercel integrated Clerk changes env source, not domain semantics

**Rationale**: Devlens auth semantics already depend on Clerk Organization as Team. Vercel integration should supply env vars and deployment wiring, not change Manager/Developer behavior.

**Alternatives considered**: Rebuild auth from scratch. Rejected because `@clerk/nextjs` already exists and living specs define target auth.

### D2: Verify code before changing it

**Rationale**: The project may already have much of Clerk installed. Implementation should inspect provider wiring, proxy/middleware, route guards, auth controls, and env handling before edits.

**Alternatives considered**: Always run `clerk init` and accept all changes. Rejected because it may overwrite working app-specific auth code.

### D3: Clerk CLI setup must authenticate before init

**Rationale**: Clerk CLI workflow requires install/update, then `clerk auth login`, then `clerk init --app app_3E8lz4sxdjUzfdcfua63yDGDuZy`.

**Alternatives considered**: List apps or initialize before login. Rejected because setup instructions explicitly forbid it.

### D4: Real Clerk credentials stay outside repo

**Rationale**: Clerk secret keys are secrets. The secret shared in chat should be rotated and never written to artifacts. `.env.example` should use placeholders only.

**Alternatives considered**: Write provided keys into `.env`. Rejected because agents must not read/print/write env secrets unless explicitly necessary, and leaked secret is compromised.

### D5: Next.js auth checks use async `auth()`

**Rationale**: Next.js 15+ requires `await auth()`. This project uses Next 16, so any `auth()` calls must be awaited.

**Alternatives considered**: Leave sync `auth()` patterns. Rejected because they are invalid for current Next.js.

### D6: ClerkProvider belongs inside `<body>`

**Rationale**: Clerk Next.js App Router guidance places `ClerkProvider` inside `<body>`, not wrapping `<html>`.

**Alternatives considered**: Wrap `<html>`. Rejected due Clerk integration rules.

## Migration Plan

1. Before running Clerk commands, present setup checklist and ask for confirmation.
2. Inspect project for existing Clerk files/usages: provider, layout, proxy/middleware, route guards, auth controls, env examples.
3. Install or update Clerk CLI from project root.
4. Run `clerk auth login` and wait for user login completion if needed.
5. Run `clerk init --app app_3E8lz4sxdjUzfdcfua63yDGDuZy` for this existing project.
6. Review generated or changed files before accepting final code.
7. For Next.js, ensure proxy/middleware matcher contains `'/(api|trpc)(.*)'` and `'/__clerk/(.*)'` exactly once in the required order when matcher exists.
8. Ensure `ClerkProvider` is correctly placed and imports use `@clerk/nextjs`, not `@clerk/clerk-react`.
9. Ensure visible auth controls exist: signed-out sign-in/sign-up, signed-in user button.
10. Ensure route protection preserves Devlens rules: dashboard/API management protected by Clerk, `/v1/*` protected by API Key.
11. Update `.env.example` or docs with placeholders only if missing.
12. Run `clerk doctor`.
13. Run app verification: build, lint, tests, and manual auth flow where possible.
14. Update living specs if auth behavior, env setup, route protection, or workflow changes.

## Code Change Expectation

Maybe. If current code already has correct Clerk provider, matcher, guards, async `auth()`, and auth controls, migration may only need env/docs/setup changes. Code changes are needed if any of these are missing or wrong:

- Missing or misplaced `ClerkProvider`
- `auth()` used without `await`
- Missing proxy/middleware matcher for `'/__clerk/(.*)'`
- `@clerk/clerk-react` used in Next.js instead of `@clerk/nextjs`
- Dashboard or management APIs not protected by Clerk
- `/v1/*` accidentally protected by Clerk instead of API Key auth
- No visible sign-in/sign-up/user controls
- Real Clerk keys present in committed files

## Risks / Trade-offs

- **Risk**: Clerk CLI modifies app files unexpectedly → **Mitigation**: inspect diff after `clerk init` and keep only intended changes.
- **Risk**: Secret leakage → **Mitigation**: rotate leaked secret, use placeholders in repo, put real values only in local/Vercel env.
- **Risk**: `/v1/*` auth regression → **Mitigation**: test API Key auth separately from dashboard Clerk session.
- **Risk**: Organization/Team mismatch → **Mitigation**: verify Clerk Organization ID mapping and local Team resolution during sign-up/invite flows.
- **Risk**: Vercel env mismatch → **Mitigation**: use Vercel integrated Clerk env injection and `clerk doctor`/deployment checks.
