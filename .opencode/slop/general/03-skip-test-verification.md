# Claim completion without running verification

**Severity**: critical
**Layer**: general

## What went wrong

Agent claimed work was "done" or "fixed" without running verify commands: `pnpm build`, `pnpm lint`, `pnpm test`.

## What should have happened

Before claiming completion:
1. `pnpm build` — must pass
2. `pnpm lint` — must pass
3. `pnpm test` — must pass
4. Only then declare completion

## Why it matters

AGENTS.md rule 10 requires verification. Untested claims waste time on follow-up fixes. Build/lint failures break CI.

## How to avoid

- Use `verification-before-completion` skill
- Use `quality-checks` skill
- Run all three commands before any "done" statement
- Report actual pass/fail results, not assumptions
