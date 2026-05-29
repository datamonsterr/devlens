## Context

Full RBAC audit conducted on current codebase. Existing architecture:
- `requireTeamContext()`: authenticates and returns context (role + team + user). No role filter.
- `requireTeamRole(allowedRoles)`: hierarchy check (manager=2 >= developer=1).
- `requireManagerContext()`: shorthand for `requireTeamRole("manager")`.
- `assertManager()`: alias of `requireManagerContext()` (legacy, used by non-team routes like providers, pricing, models, oauth, tunnel).
- `useRole()` hook: client-side, fetches `/api/team` for context role, returns `{ role, isManager, isDeveloper, isLoaded }`.
- `RoleGuard`: client-side component, redirects on role mismatch.

The RBAC model itself is sound. Issues are about completeness and defense-in-depth.

### API Route Auth Coverage Map

| Route | Current Guard | Correct? | Fix |
|-------|---------------|----------|-----|
| `GET /api/team` | `requireTeamContext()` | OK (both roles need this) | Remove leaky fields from response |
| `PUT /api/team` | `requireTeamContext()` + inline role check | V8 | Replace with `requireManagerContext()` |
| `GET /api/team/members` | `requireManagerContext()` | OK | — |
| `POST /api/team/members` | `requireManagerContext()` | V6 | Add security checks |
| `DELETE /api/team/members` | `requireManagerContext()` | OK | — |
| `GET /api/team/members/[id]` | `requireManagerContext()` | OK | — |
| `PATCH /api/team/members/[id]` | `requireManagerContext()` | OK | — |
| `GET /api/team/members/[id]/usage` | `requireManagerContext()` | OK | — |
| `GET /api/team/members/[id]/logs` | `requireManagerContext()` | OK | — |
| `GET /api/team/overview` | `requireManagerContext()` | OK | — |
| `GET /api/team/logs` | `requireManagerContext()` | OK | — |
| `GET /api/team/rtk-pool` | `requireTeamContext()` | **V1** | Upgrade to `requireManagerContext()` |
| `PUT /api/team/rtk-pool` | `assertManager()` + `requireTeamContext()` | OK | — |
| `GET /api/team/rtk-pool/history` | `requireTeamContext()` + `assertManager()` | OK | — |
| `GET /api/team/settings` | `requireTeamContext()` + inline | V4 | Replace with `requireManagerContext()` |
| `PUT /api/team/settings` | `requireTeamContext()` + inline | V4 | Replace with `requireManagerContext()` |
| `GET /api/settings` | **None** | **V3** | Add `requireTeamContext()` |
| `PATCH /api/settings` | `assertManager()` | OK | — |

All non-team manager routes (providers, pricing, models, oauth, tunnel, provider-nodes) already use `assertManager()` — correct.

## Goals / Non-Goals

**Goals:**
- Fix all audit findings (V1-V11).
- Add server-side page-level role enforcement to prevent manager page bundle loading for developers.
- Add comprehensive invitation security: self-invite prevention, duplicate detection across all roles, role validation.
- Enable local dev developer testing via `DEV_USER_ROLE` env var.
- Add role-aware login routing.
- Clean up `toTeamRole` to remove `unsafe_metadata` fallback.
- Reduce `/api/team` information disclosure.
- Normalize all team route auth to `requireManagerContext()`.
- Fix `useRole` hook for Clerk-independent local dev sessions.

**Non-Goals:**
- Replacing the `useRole` hook or `RoleGuard` component — they remain as defense-in-depth client-side guards.
- Adding multi-team membership or org-level RBAC.
- Changing the Clerk auth flow for production deployments.
- Adding audit logging for role changes.
- Restructuring the page hierarchy or adding new dashboard pages.
- Adding owner-level permission tier or self-service manager creation.

## Decisions

### D1. Fix individual API routes, not refactor the entire auth system
The existing auth primitives are well-designed. Each fix is a targeted change to a specific route.

### D2. Server-side page guard via layout component, not middleware.ts
The page guard cannot live in middleware.ts because:
- Middleware has no access to the `useRole` hook's `/api/team` context.
- Adding Clerk `auth()` to middleware.ts adds Clerk dependency that breaks local dev.
- The layout component fires before page component rendering, preventing manager page bundles from mounting.

Implementation: Add `RolePageGuard` to `DashboardLayout.js` (the single `"use client"` layout wrapper). It checks `pathname` against a manager-only route list and redirects developers.

### D3. Normalize all team route auth to `requireManagerContext()`
Four routes use inline `ctx.role !== "manager"` instead. Replace all with `requireManagerContext()` for consistency. The `/api/team` root endpoint stays at `requireTeamContext()` since it's called by `useRole()` for both roles.

### D4. Invitation security validations
All checks happen server-side in `POST /api/team/members`:
1. **Self-invite check**: reject if `normalizedEmail === managerEmail`. Manager email obtained from DB via `ctx.userId`.
2. **Duplicate check**: query `SELECT id, role FROM users WHERE teamId = ? AND email = ?` (no role filter). Reject with 409 if exists, regardless of role or status.
3. **Body role validation**: reject if `body.role` is present and not `"developer"`. Only developer role can be assigned via this endpoint.
4. **No separate endpoint for manager creation**: manager promotion remains available only through `PATCH /api/team/members/[id]` (which already enforces ≥1 active manager rule).

### D5. Local dev developer testing via `DEV_USER_ROLE`
In `getLocalDevContext()`, check `process.env.DEV_USER_ROLE` before defaulting to `"manager"`. Valid values: `"manager"`, `"developer"`. Default: `"manager"` (backward compatible). The user record's role is updated when switching roles. The auth_token cookie claims include the role.

The local dev identity uses a fixed `clerkUserId` (`"local-dev-user"`) regardless of role. Switching `DEV_USER_ROLE` updates the `role` column on the existing user record — no orphaned records, same API keys, same usage history.

### D6. Role-aware login via `/api/auth/me`
New endpoint returns `{ role, userId, teamId }` from the current session. Login page calls it after successful auth and redirects:
- `developer` → `/dashboard/usage`
- `manager` → `/dashboard/team`
- No role → `/dashboard`

This is cleaner than embedding role in the login response, which would couple auth with business logic.

### D7. Local DB as authoritative role source (ADR 0004)
Clerk `public_metadata.role` is used only for initial provisioning. After that, `users.role` in the local DB is the system of record. In `getTeamContext()`, check for an existing user row first and use `users.role` if it exists. Only fall back to `toTeamRole()` + Clerk metadata for first-time provisioning. This prevents `PATCH /api/team/members/:id` role changes from being reverted by Clerk session refresh, webhook reprocessing, or re-login.

### D8. Clean up `toTeamRole` — remove `unsafe_metadata`
Change to check `public_metadata.role` only, then `orgRole === "org:admin"`, then default `"developer"`. Remove the `unsafe_metadata` path entirely. This field can be modified by the Clerk client SDK.

### D8. Reduce `/api/team` GET response
Remove `clerkOrgId` and `rtkPool` from the response. The frontend `useRole` hook only reads `context.role`. No other consumer depends on these fields.

### D9. Fix `useRole` hook — decouple from Clerk state
Current behavior: the hook fetches `/api/team` only when Clerk `user` is loaded, and computes `isLoaded = isUserLoaded && isContextLoaded`. In local dev, Clerk never loads, so the hook stays in "Loading role" forever — sidebar never renders, page guard never fires.

Fix: always fetch `/api/team` unconditionally. `isLoaded = isContextLoaded` only (no Clerk dependency). Remove the `user?.publicMetadata?.role` fallback entirely — the server is the authoritative source for role after the ADR 0004 decision.

```
Before: isLoaded = isUserLoaded && isContextLoaded, role = contextRole || metadata
After:  isLoaded = isContextLoaded,            role = contextRole
```

## Risks / Trade-offs

- **Server-side page guard adds overhead**. Each dashboard navigation makes a `/api/team` call. This is the same call `useRole` already makes — the layout version fires slightly earlier. Acceptable.
- **Developer-only invites limit future flexibility**. If multi-manager support is needed, a dedicated endpoint or policy flag should be added later.
- **`DEV_USER_ROLE` must be documented as dev-only**. It affects local dev only; production always uses Clerk for role assignment.
- **Removing `unsafe_metadata` could break Clerk webhook flows** if Clerk ever stores role there. Audit confirms role is in `public_metadata` only.
- **DB-Clerk role divergence is intentional.** `users.role` may differ from Clerk `public_metadata.role` after promote/demote. Any future Clerk-sync tooling must treat DB as authoritative. ADR 0004 records this decision.
- **`getTeamContext()` DB-first lookup adds one extra query per auth check.** Acceptable — the query is a simple indexed PK lookup on `(clerkUserId, teamId)`.

## Migration Plan

1. Fix `GET /api/team/rtk-pool` — `requireTeamContext()` → `requireManagerContext()`.
2. Fix `GET /api/settings` — add `requireTeamContext()`.
3. Normalize `GET/PUT /api/team/settings` — replace inline role check with `requireManagerContext()`.
4. Reduce `GET /api/team` response — remove `rtkPool`, `clerkOrgId`.
5. Normalize `PUT /api/team` — replace inline role check with `requireManagerContext()`.
6. Add server-side page guard to `DashboardLayout.js`.
7. Add invitation security to `POST /api/team/members`.
8. Add `DEV_USER_ROLE` support to `getLocalDevContext()`.
9. Create `GET /api/auth/me` endpoint.
10. Update login page for role-based redirect + email field.
11. Clean up `toTeamRole` — remove `unsafe_metadata`.
12. Fix `useRole` hook — fetch `/api/team` unconditionally.
13. Verify all fixes.
