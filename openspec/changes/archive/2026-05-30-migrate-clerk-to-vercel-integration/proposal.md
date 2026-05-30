## Why

Devlens already targets Clerk Team auth, but current setup needs to be aligned with the Vercel integrated Clerk workflow so production deployments use Clerk-provided environment configuration instead of manually copied local credentials. This reduces deployment friction and avoids committing or leaking Clerk secrets while preserving Devlens auth semantics: Clerk Organization maps to Team, Managers configure Team resources, Developers use API Keys for `/v1/*`.

The current project already includes `@clerk/nextjs`, so this change should verify whether code changes are needed rather than blindly re-scaffolding auth. Vercel integrated Clerk should mainly affect environment setup unless the app still has legacy auth, missing Clerk provider wiring, missing proxy matcher, missing visible auth controls, or outdated Next.js auth usage.

## What Changes

- Document and implement a safe migration from current Clerk configuration to Vercel integrated Clerk
- Use Clerk CLI linked to app `app_3E8lz4sxdjUzfdcfua63yDGDuZy` for setup checks, without writing real secrets to committed files
- Verify existing Next.js Clerk integration: `ClerkProvider`, auth controls, protected dashboard/API routes, Organization/Team assumptions, and async `auth()` usage
- Ensure Next.js proxy/middleware matcher includes Clerk auto-proxy path `'/__clerk/(.*)'` after `'/(api|trpc)(.*)'` when applicable
- Preserve `/v1/*` API Key auth and avoid replacing it with Clerk session auth
- Update env examples/docs with placeholders only; configure real keys through local `.env`/`.env.local` and Vercel integrated env vars
- Run `clerk doctor`, build, lint, and relevant tests after setup
- Update living specs if auth behavior, env contract, routes, or agent workflow changes

## Capabilities

### New Capabilities

- `vercel-integrated-clerk-setup`: Devlens can use Clerk credentials provisioned through Vercel integration for production deployments.
- `clerk-cli-setup-check`: Operators can run Clerk CLI setup/doctor against the correct Clerk app without exposing secrets in repo files.

### Modified Capabilities

- `clerk-auth`: Auth setup must support Vercel integrated Clerk env management while keeping Clerk Organization to Team mapping.
- `vercel-runtime`: Production deployment must receive Clerk env vars from Vercel/Clerk integration and fail clearly if missing.

## Impact

- **Env**: Real `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must live in local env/Vercel env only. `.env.example` may include placeholders but no real keys.
- **Auth code**: May need small changes if provider, middleware/proxy, auth controls, or async `auth()` usage are incomplete.
- **Routes**: Dashboard and management APIs stay Clerk-session protected; `/v1/*` stays API Key authenticated.
- **Docs**: Update living specs or deployment docs if setup contract changes.
- **Security**: Rotate any leaked Clerk secret before using Vercel integration.
