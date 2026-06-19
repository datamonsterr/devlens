# Write usage events with NULL teamId or userId

**Severity**: critical
**Layer**: features/usage-analytics

## What went wrong

Agent wrote usage tracking code that passed NULL `teamId` or `userId` to the usage database, breaking tenant attribution and analytics queries.

## What should have happened

Every usage event MUST have:
- `teamId` — from API Key auth context or dashboard session
- `userId` — from API Key auth context or dashboard session
- `apiKeyId` — from API Key auth context (nullable for dashboard)
- All three resolved BEFORE the SSE stream starts

## Why it matters

Without `teamId`/`userId`, analytics are broken:
- Manager cannot see team usage
- Developer cannot see own usage
- Cost attribution fails
- Pricing Override lookups fail
- Audit trail incomplete

## How to avoid

- Read `docs/usage-analytics/technical.md`
- Check `src/sse/handler.js` for context injection point before streaming
- Add validation: reject/warn if `teamId` or `userId` is null before writing usage
- Test: verify `usageHistory` row has non-null teamId after each `/v1/*` call
- The `fix-team-management-flows` change specifically fixed NULL teamId/userId in SSE stream
