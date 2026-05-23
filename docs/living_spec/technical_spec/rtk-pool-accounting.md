# RTK Pool accounting

## State

`teams.rtkPool` stores remaining token savings as integer.

## Operations

- `allocate`: additive top-up.
- `reset`: explicit overwrite for billing cycle.
- `consume`: decrement after RTK saves tokens.

## Consume rule

Atomic update:

```sql
UPDATE teams
SET rtkPool = rtkPool - ?
WHERE id = ? AND rtkPool >= ?;
```

If update affects zero rows, RTK disables for request or skips savings write. API request must not fail only because pool is empty.

## History

Every successful operation writes `rtkPoolHistory` with Team, action, amount, remainingAfter, timestamp.
