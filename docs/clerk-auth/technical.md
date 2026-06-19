# Clerk Auth — Technical

## Architecture

Clerk provides SSO, session management, and Organization multi-tenancy for Devlens dashboard.

### Middleware (`src/middleware.ts`)
- Clerk middleware with `createRouteMatcher` for public routes
- Public: `/`, `/landing`, `/sign-in`, `/sign-up`, `/onboarding`, `/api/v1/*`, `/api/v1beta/*`, `/api/health`, `/api/auth/*`, OAuth callbacks
- Protected: `/dashboard/*`, management `/api/*`
- Fallback JWT via `auth_token` cookie (HMAC JWT verified in middleware)
- JWT secret: `JWT_SECRET` env var or `devlens-local-dev-secret`

### Clerk Components
```
src/app/layout.js          → ClerkProvider wraps root
src/app/sign-in/           → Clerk sign-in catch-all
src/app/sign-up/           → Clerk sign-up catch-all
src/app/onboarding/        → Role selection + team creation flow
src/app/page.js            → Auth-aware redirect (sign-in | onboarding | dashboard)
src/app/api/auth/clerk-webhook/ → Clerk webhook handler for user/org sync
```

### Auth Modules (`src/lib/auth/`)
| Module | Purpose |
|--------|---------|
| `auth.js` | `getUserAuth()`, role hierarchy, `requireManager()` |
| `dashboardSession.js` | HMAC JWT create/verify, cookie management |
| `teamContext.js` | Team-scoped auth resolution |
| `loginLimiter.js` | Rate limiting |
| `oidc.js` | OIDC support |

### Self-Healing
On authenticated requests, if Clerk Org or user row is missing in local DB:
1. Check Clerk session for active Org
2. Create `teams` row if missing (maps to Clerk Org)
3. Create `users` row if missing (maps to Clerk user)
4. Apply dev/manager roles based on metadata

### Vercel Integration
- Uses Clerk-Vercel integration (not separate Clerk app)
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, Clerk webhook secret configured in Vercel env
- Local dev uses `.env` or `.env.local`

### Key Constraints
- Dashboard APIs require Clerk session (not API Key)
- `/v1/*` uses API Key auth only (not Clerk session)
- Manager cannot use `/v1/*`, Developer cannot modify team config
- Invite flow: Manager → Clerk invitation → Developer sign-up → onboarding → status `onboarded`

## Source Files
- `src/middleware.ts` — route protection, JWT fallback
- `src/lib/auth/` — auth helpers
- `src/app/sign-in/`, `src/app/sign-up/` — Clerk pages
- `src/app/onboarding/` — role + team setup
- `src/app/api/auth/clerk-webhook/` — webhook handler
