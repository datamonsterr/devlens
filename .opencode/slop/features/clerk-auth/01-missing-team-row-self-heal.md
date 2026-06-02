# Forget to self-heal missing team/user rows

**Severity**: critical
**Layer**: features/clerk-auth

## What went wrong

Agent wrote auth code that assumes `teams` and `users` rows always exist, failing when Clerk webhook missed the creation event.

## What should have happened

Every authenticated dashboard request must self-heal:
1. Check Clerk session for active Org
2. If `teams` row missing for Org ID → create it
3. If `users` row missing for Clerk user ID → create it
4. Apply correct role from Clerk metadata or invitation status

## Why it matters

Clerk webhooks can be missed (network, configuration, Vercel cold start). Without self-heal, users get blocked from dashboard with "team not found" errors.

## How to avoid

- Always wrap team/user resolution in a `getOrCreate` pattern
- Check `src/lib/auth/teamContext.js` for existing pattern
- Test with fresh Clerk account that has no local rows
- Never assume `SELECT` on teams/users always returns a row
