## 1. Preflight and safety

- [ ] 1.1 Rotate the leaked `CLERK_SECRET_KEY` in Clerk before production use
- [ ] 1.2 Confirm Vercel integrated Clerk is connected to app `app_3E8lz4sxdjUzfdcfua63yDGDuZy`
- [x] 1.3 Create implementation worktree under `./worktrees/` before editing code
- [x] 1.4 Copy local `.env` into the worktree without printing or committing secrets
- [x] 1.5 Run `npm install` in the worktree
- [x] 1.6 Inspect current git status and preserve unrelated user changes

## 2. Current auth inventory

- [x] 2.1 Search for existing Clerk usage in `src/`, app layouts, route handlers, and middleware/proxy files
- [x] 2.2 Verify `@clerk/nextjs` is used and `@clerk/clerk-react` is not used in Next.js code
- [x] 2.3 Verify `ClerkProvider` exists and is placed inside `<body>` for App Router
- [x] 2.4 Verify all `auth()` calls are awaited because the project uses Next.js 16
- [x] 2.5 Verify dashboard routes and management APIs require Clerk session auth
- [x] 2.6 Verify `/v1/*` and `/v1beta/*` continue to use API Key auth only
- [x] 2.7 Verify visible sign-in, sign-up, and signed-in user controls exist in navigation/layout
- [x] 2.8 Check committed env examples/docs for real Clerk keys and replace any with placeholders

## 3. Clerk CLI setup

- [x] 3.1 Present the Clerk setup checklist and get user confirmation before running CLI setup commands
- [x] 3.2 Check whether Clerk CLI exists with `command -v clerk && clerk --version`
- [ ] 3.3 If Clerk CLI exists, run `clerk update --yes`
- [x] 3.4 If Clerk CLI is missing, install it using the user's preferred package manager or `npm install -g clerk`
- [x] 3.5 Run `clerk auth login` immediately after install/update and wait for user login flow if needed
- [ ] 3.6 Run `clerk init --app app_3E8lz4sxdjUzfdcfua63yDGDuZy` from the existing project root
- [x] 3.7 Inspect all files changed by Clerk CLI and keep only intended integration changes

## 4. Next.js proxy/middleware verification

- [x] 4.1 Locate `proxy.ts`, `proxy.js`, `middleware.ts`, or `middleware.js`
- [x] 4.2 If matcher exists, ensure it includes `'/(api|trpc)(.*)'`
- [x] 4.3 Ensure matcher includes `'/__clerk/(.*)'` exactly once after `'/(api|trpc)(.*)'`
- [x] 4.4 Ensure matcher does not protect `/v1/*` in a way that bypasses API Key auth
- [ ] 4.5 Add or adjust tests/manual checks for dashboard protected route behavior if coverage exists

## 5. Auth UI controls

- [x] 5.1 Identify existing app navigation, shell, or landing layout
- [x] 5.2 Add or adapt Clerk signed-out sign-in/sign-up controls if missing
- [x] 5.3 Add or adapt signed-in `UserButton` or equivalent if missing
- [x] 5.4 Keep controls visually consistent with current Devlens blue-purple branding and layout
- [x] 5.5 Avoid duplicating controls if clear auth actions already exist

## 6. Environment and Vercel integration

- [x] 6.1 Update `.env.example` with Clerk placeholders only if missing
- [x] 6.2 Do not commit real `CLERK_SECRET_KEY` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [x] 6.3 Document that local development uses local env values while production uses Vercel integrated Clerk env vars
- [x] 6.4 Verify build/runtime code fails clearly when required Clerk env vars are missing
- [x] 6.5 Confirm no client code imports or exposes `CLERK_SECRET_KEY`

## 7. Devlens auth semantics

- [x] 7.1 Verify Manager sign-up creates or selects the Clerk Organization mapped to Team
- [x] 7.2 Verify Developer joins existing Team by Manager invitation flow where implemented
- [x] 7.3 Verify route handlers resolve Team context from Clerk Organization membership and local user row
- [x] 7.4 Verify Manager-only management actions remain server-enforced
- [x] 7.5 Verify Developer dashboard/API Key flows remain available for Developers
- [x] 7.6 Verify Manager still cannot use `/v1/*` by default unless current product rules explicitly allow it later

## 8. Verification

- [x] 8.1 Run `clerk doctor`
- [x] 8.2 Run `npm run build`
- [x] 8.3 Run `npm run lint`
- [x] 8.4 Run `npm test` or existing documented test command
- [x] 8.5 Start local app on `20261` if scripts/config are touched and verify auth controls are visible
- [ ] 8.6 Test sign-up flow until profile icon appears
- [ ] 8.7 If Clerk shows a "Configure your application" callout, tell the user to click it
- [ ] 8.8 Test dashboard access signed out, signed in as Manager, and signed in as Developer where possible
- [ ] 8.9 Test `/v1/*` request with API Key auth after Clerk migration

## 9. Living specs sync

- [x] 9.1 Update `docs/living_spec/feature_spec/clerk-auth.md` if setup or auth behavior changes
- [x] 9.2 Update `docs/living_spec/technical_spec/auth-and-roles.md` if route protection or env contract changes
- [x] 9.3 Update `docs/living_spec/technical_spec/local-dev-docker.md` if local setup commands or port config change
- [x] 9.4 Ensure docs use Devlens domain language: Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, CLI Config Snippet
