# Proposal: Fix Team Management Flows

## Why

The Manager Dashboard at `/dashboard/team` was built with analytics, member management, and request logs, but the end-to-end flows are broken for demo and production use. Three fundamental gaps prevent a Manager from inviting a Developer and observing their live usage:

1. **Invitation flow requires Clerk Organization API keys and webhooks.** The existing `POST /api/team/members` calls the Clerk Organizations API (`api.clerk.com/v1/organizations/.../invitations`) which needs a valid `CLERK_SECRET_KEY`. In local dev with placeholder Clerk keys, the invitation silently fails — no Developer can be added. There is no fallback or dev-mode invitation flow. The `fix-developer-invite-onboarding` change was fully spec'd but its Clerk-dependent implementation was never verifiable in local dev.

2. **SSE stream usage tracking lacks team/user attribution.** The `logUsage` function in `open-sse/utils/usageTracking.js` calls `saveRequestUsage` without `teamId` or `userId`. This affects all streaming responses that pass through the SSE transform stream (both `translate` and `passthrough` modes). While the `onStreamComplete` callback correctly tracks usage with full context, the in-stream `logUsage` path inserts records with NULL `teamId`/`userId` — these are invisible to team analytics queries and pollute the database.

3. **No demo-ready Developer account flow.** There is no mechanism to create a second local user, issue them an API key, and have their requests show up in the Manager's analytics. The demo is stuck with one `local-dev-manager` user who can't make API requests (Managers have no API keys per the spec).

## What Changes

- Add a **local dev-mode invitation endpoint** (`POST /api/team/invite`) that bypasses Clerk for development — creates a developer user directly, issues one API key, sets `inviteStatus=onboarded`, and returns credentials.
- Create a **Developer login flow** that authenticates via API key or a separate dev credential, enabling a developer browser session.
- Generate **seed/script for producing demo data** — a command that makes sample API requests as a developer to populate usage analytics with realistic numbers.
- Fix the **`logUsage` function** to accept and pass `teamId`/`userId` through to `saveRequestUsage`, and thread auth context through the SSE stream pipeline.
- Add **indexes** on `usageHistory(teamId, userId)`, `usageHistory(timestamp)`, and `usageDaily(dateKey)` for analytics query performance.
- Add **revalidation triggers** so the analytics chart updates appear immediately after usage is recorded (via SSE, `statsEmitter`, or SWR-style polling).
- Add a **`GET /api/team/members/:id` response** that includes the assigned API key plaintext for the invite flow (one-time display).
- Polish the **sidebar** to show Team Management links consistently.
- Fix the **`useRole` hook** to work without Clerk (already partially done, ensure it's robust).

## Impact

- **Managers** can now complete the full demo flow: invite a developer → see them appear in the team → watch usage populate in charts and logs after the developer makes requests.
- **Developers** get a working dev login and API key to make test requests.
- **Production path** is unchanged — Clerk integration remains for real deployments. The dev-mode invite is separate and disabled when Clerk is fully configured.
- **Streaming usage** is correctly attributed: no more NULL teamId/userId records.
- **Analytics queries** run faster with proper indexes.
