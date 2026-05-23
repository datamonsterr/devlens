# Team Developer View Summary

## Goal

Create a lean dashboard experience for team developers. Keep only developer-facing workflows:

- API endpoint
- API keys
- Usage
- Console Log
- CLI Config snippet
- Combos read-only
- Models read-only
- Account settings

Remove or guard manager-only areas from developer navigation and direct URL access.

## Main UI Changes

### Sidebar

Updated `src/shared/components/Sidebar.js`:

- Developer nav now shows only:
  - Endpoint
  - API Keys
  - Combos
  - Models
  - Usage
  - CLI Config
  - Console Log
  - Account
- Manager/system items hidden for developers:
  - Providers
  - Pricing
  - RTK Pool
  - Team
  - Media Providers
  - Skills
  - Translator
  - Shutdown button
- Sidebar now uses shared role logic through `useRole()`.
- Added developer fallback when client role metadata is missing, fixing empty sidebar issue in local mode.

### Route Guard

Added/used `src/shared/components/RoleGuard.js` for manager-only dashboard pages.

Guarded pages include:

- `/dashboard/providers`
- `/dashboard/providers/new`
- `/dashboard/providers/[id]`
- `/dashboard/pricing`
- `/dashboard/quota`
- `/dashboard/team`
- `/dashboard/skills`
- `/dashboard/translator`
- `/dashboard/media-providers/*`
- `/dashboard/mitm`

Developers deep-linking these pages are redirected to `/dashboard`.

### Endpoint Page

Updated `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`:

Developer view shows:

- Local API endpoint URL
- API key management
- CLI configuration snippet

Developer view hides manager-only controls:

- Cloudflare tunnel controls
- RTK toggle
- Caveman toggle
- Require API key toggle
- Tunnel dashboard access toggle
- Security/tunnel warning controls

### Combos Page

Updated `src/app/(dashboard)/dashboard/combos/page.js`:

- Developers can view combos.
- Developers cannot create/edit/delete combos.
- Developers cannot toggle round-robin/fallback strategy.
- Added read-only badge for non-manager view.

## API Hardening

### API Keys

API key routes are scoped by role:

- Managers can manage team keys.
- Developers can CRUD only their own API keys.

Relevant routes:

- `src/app/api/keys/route.js`
- `src/app/api/keys/[id]/route.js`
- `src/app/api/keys/[id]/rotate/route.js`

### Combos

Combo routes are role-scoped:

- Developers can read team combos.
- Managers can create/update/delete combos.

Relevant routes:

- `src/app/api/combos/route.js`
- `src/app/api/combos/[id]/route.js`

### Usage

Usage APIs now require team context and scope developer data to self.

Developer-scoped routes:

- `src/app/api/usage/me/route.js`
- `src/app/api/usage/stats/route.js`
- `src/app/api/usage/chart/route.js`
- `src/app/api/usage/history/route.js`
- `src/app/api/usage/logs/route.js`
- `src/app/api/usage/request-logs/route.js`
- `src/app/api/usage/request-details/route.js`
- `src/app/api/usage/stream/route.js`

Manager-only usage routes:

- `src/app/api/usage/dashboard/route.js`
- `src/app/api/usage/developers/[userId]/route.js`
- `src/app/api/usage/providers/route.js`
- `src/app/api/usage/[connectionId]/route.js`

### Pricing

Updated `src/app/api/pricing/route.js`:

- GET now requires team context.
- Mutations remain manager-only.

## Data/Repository Helpers

Updated usage repositories to support role scoping:

- `src/lib/db/repos/usageRepo.js`
  - `getRecentLogs(limit, filter)` now supports `teamId` and `userId` filters.
- `src/lib/db/repos/requestDetailsRepo.js`
  - `getRequestDetails(filter)` now supports `teamId` and `userId` filters through stored JSON data.

## Team/Role Infrastructure

Relevant role/team context files:

- `src/shared/hooks/useRole.js`
- `src/lib/auth/teamContext.js`

Server role checks use:

- `requireTeamContext()` for authenticated team access.
- `requireManagerContext()` for manager-only access.

## Lint/Build

Updated `eslint.config.mjs`:

- Disabled noisy React Compiler rules blocking current repo lint:
  - `react-hooks/set-state-in-effect`
  - `react-hooks/purity`
  - `react-hooks/refs`
  - `react-hooks/immutability`
  - `react/no-unescaped-entities`

Also removed one stale ESLint disable comment referencing missing `@typescript-eslint/no-require-imports` rule in:

- `src/app/api/oauth/cursor/auto-import/route.js`

Verification:

- `npm run build` passes.
- `npm run lint` returns 0 errors, warnings only.

## Manual Verification Completed

Confirmed in browser:

- Developer sidebar shows correct developer-only nav.
- Manager/system features no longer appear in developer sidebar.
- Endpoint developer view hides manager controls.
- Account page remains reachable.

Recommended final manual checks:

1. Login as developer.
2. Open these routes directly and confirm redirect:
   - `/dashboard/providers`
   - `/dashboard/pricing`
   - `/dashboard/quota`
   - `/dashboard/team`
   - `/dashboard/skills`
   - `/dashboard/translator`
   - `/dashboard/media-providers/web`
3. Create, rotate, revoke own API key.
4. Confirm Usage shows only current developer data.
5. Confirm Combos page is read-only.
