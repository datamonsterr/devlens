## T1. Fix GET /api/team/rtk-pool — Add Manager Role Check

- [ ] T1.1 Read `src/app/api/team/rtk-pool/route.js` GET handler
- [ ] T1.2 Change import: replace `requireTeamContext` with `requireManagerContext`
- [ ] T1.3 Change guard call: `requireTeamContext()` → `requireManagerContext()` in GET handler
- [ ] T1.4 Verify PUT handler still uses `assertManager()` — keep unchanged

## T2. Fix GET /api/settings — Add Auth Guard

- [ ] T2.1 Read `src/app/api/settings/route.js` GET handler
- [ ] T2.2 Add `import { requireTeamContext } from "@/lib/auth"` to imports
- [ ] T2.3 Add `const ctx = await requireTeamContext();` at top of GET handler
- [ ] T2.4 Verify PATCH handler still uses `assertManager()` — keep unchanged

## T3. Normalize /api/team/settings — Replace Inline Role Check

- [ ] T3.1 Read `src/app/api/team/settings/route.js`
- [ ] T3.2 In GET handler: replace `const ctx = await requireTeamContext(); if (ctx.role !== "manager")` with `const ctx = await requireManagerContext();`
- [ ] T3.3 In PUT handler: replace `const ctx = await requireTeamContext(); if (ctx.role !== "manager")` with `const ctx = await requireManagerContext();`
- [ ] T3.4 Remove unused `import { requireTeamContext } from "@/lib/auth"` if no longer needed

## T4. Reduce /api/team GET Response

- [ ] T4.1 Read `src/app/api/team/route.js` GET handler
- [ ] T4.2 Change the SQL query to select only `id, name, createdAt, updatedAt` (remove `clerkOrgId, rtkPool`)
- [ ] T4.3 Verify the response no longer includes `clerkOrgId` or `rtkPool`
- [ ] T4.4 Verify `useRole` hook still works — it only reads `data?.context?.role`

## T5. Normalize PUT /api/team — Replace Inline Role Check

- [ ] T5.1 Read `src/app/api/team/route.js` PUT handler
- [ ] T5.2 Remove the `import { requireTeamContext } from "@/lib/auth"` if no longer needed for GET
- [ ] T5.3 Add `import { requireManagerContext } from "@/lib/auth"` to imports
- [ ] T5.4 Replace `const ctx = await requireTeamContext(); if (ctx.role !== "manager")` with `const ctx = await requireManagerContext();`
- [ ] T5.5 Keep `requireTeamContext` import if GET still uses it (GET has higher call frequency — keep GET at `requireTeamContext`)

## T6. Add Server-Side Page Guard to Dashboard Layout

- [ ] T6.1 Read `src/shared/components/layouts/DashboardLayout.js` — this is the single `"use client"` layout wrapper
- [ ] T6.2 Add a role check effect that runs on mount and pathname changes:
  ```js
  const { isManager, isDeveloper, isLoaded } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  const MANAGER_ONLY_PATHS = [
    "/dashboard/team",
    "/dashboard/providers",
    "/dashboard/pricing",
    "/dashboard/quota",
    "/dashboard/skills",
    "/dashboard/translator",
    "/dashboard/mitm",
    "/dashboard/media-providers",
    "/dashboard/console-log",
  ];

  useEffect(() => {
    if (!isLoaded) return;
    const isManagerOnly = MANAGER_ONLY_PATHS.some(p => pathname.startsWith(p));
    if (isManagerOnly && isDeveloper) {
      router.replace("/dashboard/usage");
    }
  }, [isLoaded, isManager, isDeveloper, pathname, router]);
  ```
- [ ] T6.3 Add `import { useRole } from "@/shared/hooks/useRole"` and `import { useRouter } from "next/navigation"` to DashboardLayout
- [ ] T6.4 Intercept: if developer navigates to manager path, redirect to `/dashboard/usage` before children render
- [ ] T6.5 Note: `RoleGuard` remains on individual pages as defense-in-depth — do not remove existing guards
- [ ] T6.6 Verify: developer type `/dashboard/team/analytics` in URL → redirected to `/dashboard/usage`

## T7. Add Invitation Security Checks

- [ ] T7.1 Read `src/app/api/team/members/route.js` POST handler
- [ ] T7.2 Add self-invite check after `normalizedEmail` is derived:
  ```js
  const managerUser = await adapter.get(
    `SELECT email FROM users WHERE id = ? AND teamId = ?`,
    [ctx.userId, ctx.teamId]
  );
  if (managerUser && managerUser.email && normalizedEmail === managerUser.email.toLowerCase().trim()) {
    return NextResponse.json({ error: "Cannot invite yourself to the team" }, { status: 400 });
  }
  ```
- [ ] T7.3 Broaden duplicate check: remove the `AND role = 'developer'` clause — check all roles and statuses:
  ```js
  const existing = await adapter.get(
    `SELECT id, role, isActive FROM users WHERE teamId = ? AND email = ?`,
    [ctx.teamId, normalizedEmail]
  );
  if (existing) {
    const status = existing.isActive ? "active" : "inactive";
    return NextResponse.json({ error: `User already exists in this team (${status})` }, { status: 409 });
  }
  ```
- [ ] T7.4 Add role validation on request body:
  ```js
  const { email, role } = body;
  if (role && role !== "developer") {
    return NextResponse.json({ error: "Only developer role can be assigned via invitation" }, { status: 400 });
  }
  ```
- [ ] T7.5 Add check to reject invite when no `CLERK_SECRET_KEY` and `ALLOW_LOCAL_INVITES` is not set (verify existing logic is sufficient)
- [ ] T7.6 Verify all checks with curl: self-invite → 400, duplicate → 409, body role=manager → 400, valid invite → 202

## T8. Add DEV_USER_ROLE — Local Dev Developer Testing

- [ ] T8.1 Read `src/lib/auth/teamContext.js` `getLocalDevContext()` function
- [ ] T8.2 Add `DEV_USER_ROLE` env var support with fixed local dev identity:
  ```js
  const devRole = process.env.DEV_USER_ROLE || "manager";
  const validRoles = ["manager", "developer"];
  const role = validRoles.includes(devRole) ? devRole : "manager";
  const user = await ensureUser(adapter, "local-dev-user", team.id, role);
  ```
  Note: `ensureUser` returns existing record without updating role. Since role is now a runtime switch, update it explicitly when switching:
  ```js
  if (user.role !== role) {
    await adapter.run(
      `UPDATE users SET role = ?, updatedAt = ? WHERE clerkUserId = ? AND teamId = ?`,
      [role, new Date().toISOString(), "local-dev-user", team.id]
    );
    user.role = role;
  }
  ```
- [ ] T8.3 Return `role` in the context object (already returned via `user.role`)
- [ ] T8.4 Add `DEV_USER_ROLE=developer` to `.env` example with comment: `# Set to 'developer' to test developer-specific flows locally`
- [ ] T8.5 Verify: set `DEV_USER_ROLE=developer`, restart server, login → sidebar shows Developer Portal, team pages redirect

## T9. Add GET /api/auth/me Endpoint

- [ ] T9.1 Create `src/app/api/auth/me/route.js`:
  ```js
  import { NextResponse } from "next/server";
  import { requireTeamContext } from "@/lib/auth";

  export const dynamic = "force-dynamic";

  export async function GET() {
    try {
      const ctx = await requireTeamContext();
      return NextResponse.json({ role: ctx.role, userId: ctx.userId, teamId: ctx.teamId });
    } catch (error) {
      if (error instanceof Response) return error;
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  ```
- [ ] T9.2 Register `/api/auth/me` as a public route in `middleware.ts` `isPublicRoute` matcher (so it doesn't get Clerk-intercepted):
  ```ts
  "/api/auth/me",
  ```
- [ ] T9.3 Verify: `GET /api/auth/me` with auth_token cookie → `{ role, userId, teamId }`

## T10. Add Role-Based Login Redirect

- [ ] T10.1 Read `src/app/login/page.js` — the main login page
- [ ] T10.2 Update the login success handler to fetch role and redirect:
  ```js
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),  // login still uses password only
  });

  if (res.ok) {
    const roleRes = await fetch("/api/auth/me");
    if (roleRes.ok) {
      const { role } = await roleRes.json();
      if (role === "developer") {
        router.push("/dashboard/usage");
      } else if (role === "manager") {
        router.push("/dashboard/team");
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }
  ```
  Note: The login page currently sends `{ password }`. For developer password login, add an email field. See T11.
- [ ] T10.3 Add email field to login form (visible when auth mode supports it):
  - Add `<Input type="email" ...>` with `email` state variable
  - Send `{ email, password }` in login request body
  - The `/api/auth/login` route already handles email+password lookup for developer login
- [ ] T10.4 Verify: developer login → `/dashboard/usage`, manager login → `/dashboard/team`

## T11. Fix useRole Hook — Fetch Unconditionally

- [ ] T11.1 Read `src/shared/hooks/useRole.js`
- [ ] T11.2 Remove the `!user` short-circuit that skips the fetch when Clerk user is not loaded:
  ```js
  useEffect(() => {
    if (!isUserLoaded) {
      // Don't set context yet — wait for user load or timeout
      return;
    }
  ```
- [ ] T11.3 Change to: always fetch `/api/team` regardless of Clerk user state:
  ```js
  useEffect(() => {
    let cancelled = false;
    setIsContextLoaded(false);

    fetch("/api/team")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled) setContextRole(data?.context?.role || null);
      })
      .catch(() => {
        if (!cancelled) setContextRole(null);
      })
      .finally(() => {
        if (!cancelled) setIsContextLoaded(true);
      });

    return () => { cancelled = true; };
  }, [isUserLoaded]);  // re-fetch when user state changes (e.g. Clerk user logs in)
  ```
- [ ] T11.4 Remove the fallback `user?.publicMetadata?.role` — keep `contextRole` as single source:
  ```js
  const role = contextRole;
  ```
- [ ] T11.5 Decouple isLoaded from Clerk: `const isLoaded = isContextLoaded;` — remove `&& isUserLoaded`. The server is the authoritative source for role.
- [ ] T11.6 Remove `user?.publicMetadata?.role` fallback entirely: `const role = contextRole;` — no `||` chain. Clerk metadata no longer participates in runtime role resolution.
- [ ] T11.6 Verify: local dev developer loads sidebar correctly after fix

## T12. Make Local DB Authoritative for Roles — DB-First Lookup in getTeamContext

- [ ] T12.1 Read `src/lib/auth/teamContext.js` `getTeamContext()` function
- [ ] T12.2 After `ensureTeam()` and before `toTeamRole()`, add a DB-first lookup:
  ```js
  const adapter = await getAdapter();
  const team = await ensureTeam(adapter, orgId, sessionClaims);

  // DB is authoritative for roles after initial provisioning (ADR 0004)
  const existingUser = await adapter.get(
    `SELECT role FROM users WHERE clerkUserId = ? AND teamId = ?`,
    [userId, team.id]
  );
  const role = existingUser ? existingUser.role : toTeamRole(orgRole, sessionClaims);

  const user = await ensureUser(adapter, userId, team.id, role);
  ```
  Note: `ensureUser` writes `role` on creation. If the user already exists, it returns the existing record — but does NOT update role. This means role changes from `PATCH /api/team/members/:id` persist because `ensureUser` only writes on INSERT.
- [ ] T12.2 Verify: promote a developer via PATCH, then verify their role persists across re-login and Clerk session refresh

## T13. Clean Up toTeamRole — Remove unsafe_metadata

- [ ] T13.1 Read `src/lib/auth/teamContext.js` `toTeamRole` function
- [ ] T13.2 Remove `unsafe_metadata` fallback:
  ```js
  function toTeamRole(orgRole, sessionClaims) {
    const metadataRole = sessionClaims?.public_metadata?.role;
    if (metadataRole === "manager" || metadataRole === "developer") return metadataRole;
    if (orgRole === "org:admin") return "manager";
    return "developer";
  }
  ```

## T14. Verification

- [ ] T13.1 Start dev server and create a worktree with `DEV_USER_ROLE=developer` in `.env`
- [ ] T13.2 Run full RBAC test matrix:

| Test | Expected | Actual |
|------|----------|--------|
| Login as manager → redirected to `/dashboard/team` | ✓ | |
| Login as developer → redirected to `/dashboard/usage` | ✓ | |
| Manager can access `/dashboard/team/analytics` | ✓ | |
| Developer accessing `/dashboard/team/analytics` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/providers` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/pricing` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/quota` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/skills` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/translator` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/mitm` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/media-providers` → 403 redirect | ✓ | |
| Developer accessing `/dashboard/console-log` → 403 redirect | ✓ | |
| Manager sidebar shows Manager Portal sections | ✓ | |
| Developer sidebar shows Developer Portal sections only | ✓ | |
| `GET /api/team/rtk-pool` as developer → 403 | ✓ | |
| `GET /api/team/members` as developer → 403 | ✓ | |
| `GET /api/team/members/[id]` as developer → 403 | ✓ | |
| `GET /api/team/logs` as developer → 403 | ✓ | |
| `GET /api/team/overview` as developer → 403 | ✓ | |
| `GET /api/team/settings` as developer → 403 | ✓ | |
| `PUT /api/team/settings` as developer → 403 | ✓ | |
| `PUT /api/team` as developer → 403 | ✓ | |
| `GET /api/settings` as developer → 403 | ✓ | |
| `POST /api/team/members` self-invite (own email) → 400 | ✓ | |
| `POST /api/team/members` duplicate email → 409 | ✓ | |
| `POST /api/team/members` role=manager in body → 400 | ✓ | |
| `POST /api/team/members` valid invite → 202 | ✓ | |
| `GET /api/team` response has no `rtkPool` or `clerkOrgId` | ✓ | |
| `GET /api/auth/me` returns `{ role, userId, teamId }` | ✓ | |

- [ ] T13.3 Run `npm run lint` — zero new errors (existing warnings OK)
- [ ] T13.4 Update living specs via living-spec-syncer
- [ ] T13.5 Archive the change via `/opsx-archive`
