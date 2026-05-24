## Context

Managers invite Developers through Clerk Organization invitations. Devlens also creates pending Team member state and assigns one initial API Key for the Developer/Team invite flow. Current behavior misses reliable onboarding email delivery, does not clearly surface pending/onboarded state, and does not make assigned API access details easy to copy from Manager or Developer views.

Constraints: API Key plaintext can only be shown when available from creation/assignment flow; stored secrets remain HMAC-hashed. Dashboard auth remains Clerk session auth, while `/v1/*` remains API Key auth.

## Goals / Non-Goals

**Goals:**

- Make Developer invite email dispatch part of successful invite flow.
- Include sign-in URL and API URL in onboarding email.
- Persist pending invite/onboarding status and transition to onboarded on Developer success.
- Show Developer API access view with base API URL and assigned API Key when plaintext is available.
- Add copy controls for Manager Team management assigned Developer API Key display.
- Preserve one initial API Key assignment per Developer/Team.

**Non-Goals:**

- Replacing Clerk invitation mechanics.
- Changing `/v1/*` authentication from API Key auth.
- Persisting reusable plaintext API Keys beyond allowed one-time display semantics.
- Adding multi-Team membership.

## Decisions

1. Treat invite as multi-step success boundary.
   - Clerk Organization invitation MUST succeed first.
   - Pending Team member state and initial API Key assignment MUST be created idempotently.
   - Onboarding email MUST be sent after invite state exists.
   - Alternative considered: send email before local state. Rejected because email could point Developer to missing Team/API access state.

2. Store explicit invite status on Team member invite state.
   - Status values cover at least `pending` and `onboarded`.
   - Onboarding success updates status from `pending` to `onboarded`.
   - Alternative considered: infer status only from Clerk membership. Rejected because Manager UI needs Devlens-specific onboarding/API access readiness.

3. Generate API URL from configured public/base URL.
   - Email and Developer view use same canonical API base URL source.
   - Alternative considered: derive from request headers only. Rejected because emails may be sent out-of-request or behind proxy/Vercel.

4. Copyable UI wraps existing API Key display data.
   - Manager Team management adds copy affordance for displayed assigned API Key data.
   - Developer view shows base API URL and assigned API Key when one-time plaintext is available; otherwise shows metadata plus rotation/create guidance.
   - Alternative considered: store plaintext for later copy. Rejected by API Key security requirement.

## Risks / Trade-offs

- Email provider/webhook unavailable → invite fails visibly or returns clear actionable error before Manager assumes success.
- Existing pending invites without status → migration/backfill treats unknown active invites as `pending`.
- Plaintext API Key unavailable after initial display → UI must not invent/recover it; show metadata and rotate/create guidance.
- Base URL misconfigured → email/API snippets point wrong place; validate config in invite/email path where possible.

## Migration Plan

1. Add/backfill invite status field if missing.
2. Update invite API transaction/order: Clerk invite, local pending state/API Key assignment, onboarding email.
3. Update Developer onboarding success handler to mark status onboarded.
4. Update Manager and Developer views with copyable API URL/API Key affordances.
5. Rollback by disabling new email/status UI while preserving pending records and hashed API Keys.

## Open Questions

- Which existing env var is canonical for public app URL/API URL, or must a new API base URL config be introduced?
- Does current email path use Clerk email templates, app-managed email, or webhook-triggered email dispatch?
