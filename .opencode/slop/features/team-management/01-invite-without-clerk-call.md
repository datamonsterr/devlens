# Create invite locally without Clerk invitation call

**Severity**: critical
**Layer**: features/team-management

## What went wrong

Agent created a `users` row with `inviteStatus: 'pending'` but did not call Clerk API to create the Organization invitation. The invited Developer never received a Clerk invitation.

## What should have happened

1. Manager submits invite → `POST /api/team/invite`
2. Server calls Clerk API: `POST /organizations/{orgId}/invitations`
3. On Clerk success: create `users` row with `inviteId` from Clerk response
4. On Clerk failure: return error to Manager, do NOT create `users` row
5. Dev mode: `DEV_USER_ROLE` bypasses Clerk, creates local user directly

## Why it matters

Without the Clerk invitation, the Developer cannot join the team. The `users` row exists but is useless — Developer has no Clerk Organization membership path.

## How to avoid

- Read `docs/team-management/feature_spec.md` requirement: "Developer invite success requires Clerk invitation success"
- Check `src/app/api/team/invite/route.js` for the Clerk invitation API call
- Error path: "Invite API fails visibly when Clerk invitation creation fails"
- Dev mode: document that `DEV_USER_ROLE` is for local dev only
