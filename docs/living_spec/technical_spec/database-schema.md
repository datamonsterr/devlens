# Database schema

## Storage

Single SQLite database with WAL enabled.

## Required tables

- `teams`: Team identity, Clerk org id, RTK Pool.
- `users`: Clerk user id, Team, role, active state.
- `apiKeys`: HMAC hash, Developer, Team, active state, last use.
- `providerConnections`: Team-scoped upstream credentials.
- `providerNodes`: Team-scoped compatible provider nodes.
- `combos`: Team-scoped fallback model sequences.
- `pricingOverrides`: Team-scoped per-model pricing.
- `usageHistory`: Team/Developer usage events.
- `rtkPoolHistory`: Team RTK top-up, consume, reset history.
- `teamSettings`: Team quotas and config.
- `requestDetails`: sanitized Team/Developer request details.

## Schema changes needed from current code

- Remove `proxyPools` table from new installs.
- Add `teamId` to `providerNodes`.
- Add Team-safe uniqueness for `combos`: `(teamId, name)`, not global `name`.
- Add Team/Developer fields to `requestDetails`.
- Remove plaintext `apiKeys.key` once HMAC-only migration complete.
- Ensure all Team-owned indexes include `teamId` where lookup needs isolation.
