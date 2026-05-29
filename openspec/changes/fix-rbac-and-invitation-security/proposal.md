# Proposal: Fix RBAC and Invitation Security

## Why

A comprehensive audit of the RBAC implementation reveals **7 findings across 4 severity levels**. The server-side API enforcement is generally well-designed (many routes use `requireManagerContext()` or `assertManager()`), but critical gaps exist in 5 areas: missing guards, unsafe defaults, invitation flow, page access, and login routing.

### Audit Findings

**HIGH V1 — RTK Pool history leaks to developers**
`GET /api/team/rtk-pool` uses `requireTeamContext()` (no role check) and returns 50 history records alongside pool balance. A dedicated manager-only endpoint (`/api/team/rtk-pool/history`) exists but is bypassed by reading from the main pool. Developers can see allocation, consumption, and reset history.

**MEDIUM V2 — No server-side page guard**
All 13 manager-only pages rely solely on `RoleGuard` (client-side React component). Manager page bundles (JSX, API endpoints, UI strings) ship to all users and are visible via DevTools. While data is API-protected, the manager UI surface is disclosed.

**MEDIUM V3 — Settings are publicly readable**
`GET /api/settings` has no auth guard — any authenticated user can read routing strategy, proxy config, and observability settings. The profile page (`/dashboard/profile`) fetches these settings and renders them.

**MEDIUM V4 — Inconsistent team settings auth**
`GET /api/team/settings` and `PUT /api/team/settings` use `requireTeamContext()` + inline `ctx.role !== "manager"` instead of `requireManagerContext()`. This pattern could be copy-pasted to new routes without the inline check.

**MEDIUM V5 — Local dev hardcodes manager role**
`getLocalDevContext()` always creates user with `"manager"` role. No way to test developer-specific flows in local dev without Clerk.

**MEDIUM V6 — Invitation flow lacks security**
- No self-invite check (manager can invite own email)
- Duplicate check only queries `role = 'developer'` (misses existing members with other roles)
- No role validation on request body (accepts any role, though Clerk invitation always sets `public_metadata: { role: "developer" }`)
- No check for existing active/inactive users of any role

**MEDIUM V7 — Login routing is role-unaware**
Login page redirects all users to `/dashboard` regardless of role. Developer sessions land on the manager-oriented overview page.

**LOW V8 — `/api/team` PUT uses inline role check**
Uses `ctx.role !== "manager"` instead of `requireManagerContext()`. Consistent with V4.

**LOW V9 — `/api/team` GET response leaks internal fields**
Returns `rtkPool` and `clerkOrgId` in the team object. These are internal infrastructure fields not needed by the frontend `useRole` hook.

**LOW V10 — `toTeamRole` reads `unsafe_metadata`**
Checks `sessionClaims?.unsafe_metadata?.role` as a fallback path. `unsafe_metadata` is a Clerk field that can be modified client-side, making it a theoretical vector.

**LOW V11 — `useRole` hook bails when Clerk `user` is null**
The hook skips `/api/team` fetch when `!user` (Clerk user not loaded). In local dev, Clerk user may never load, meaning the hook never gets the role from the server.

## What Changes

1. **Fix RTK Pool GET** — Change from `requireTeamContext()` to `requireManagerContext()`.
2. **Fix `/api/settings` GET** — Add `requireTeamContext()` auth guard.
3. **Normalize team settings** — Replace inline role checks with `requireManagerContext()`.
4. **Reduce `/api/team` GET** — Remove `rtkPool`, `clerkOrgId` from response.
5. **Normalize `/api/team` PUT** — Replace inline role check with `requireManagerContext()`.
6. **Add server-side page guard** — Dashboard layout-level component redirects unauthorized roles before page bundles mount.
7. **Add invitation security** — Self-invite prevention, duplicate check across all roles, role validation on request body.
8. **Add `DEV_USER_ROLE`** — Allow testing developer flows locally without Clerk.
9. **Add `/api/auth/me`** — Returns session role for login routing.
10. **Add login role-based redirect** — Developer → `/dashboard/usage`, Manager → `/dashboard/team`.
11. **Clean up `toTeamRole`** — Remove `unsafe_metadata` fallback.
12. **Fix `useRole` for local dev** — Fetch `/api/team` even without Clerk `user`.
13. **Add email field to login page** — Support developer email+password login.
