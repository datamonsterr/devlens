# Implement RTK consume without atomic update

**Severity**: critical
**Layer**: features/rtk-pool

## What went wrong

Agent implemented RTK pool decrement as SELECT-then-UPDATE, creating a race condition where concurrent requests over-consume the pool.

## What should have happened

Use atomic SQL update:
```sql
UPDATE teams
SET rtkPool = rtkPool - ?
WHERE id = ? AND rtkPool >= ?
```

Check affected rows:
- 1 row affected → consume succeeded
- 0 rows affected → pool insufficient, RTK disables (no API failure)

## Why it matters

RTK pool is shared across concurrent streaming requests. Race condition on decrement causes negative pool values or lost token savings.

## How to avoid

- Read `docs/rtk-pool/technical.md` for the atomic update pattern
- Use single `UPDATE ... WHERE rtkPool >= ?` query
- Never SELECT first then UPDATE — not atomic
- Check affected rows to determine consume result
- RTK disabled when pool zero: API must NOT fail, just skip compression
