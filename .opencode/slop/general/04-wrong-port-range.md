# Use ports outside 2026x range

**Severity**: common
**Layer**: general

## What went wrong

Agent configured ports like `3000`, `3001`, `8080` instead of the `2026x` range.

## What should have happened

All project ports must use `2026x` range:
- App dev: `20262`
- Docker: `20261`
- Any new service: pick unused port in `2026x`

## Why it matters

AGENTS.md rule 6: "Rename/name all ports used by this project to the 2026x range to avoid current 9router ports."

## How to avoid

- Check AGENTS.md rule 6
- When adding new services, scan existing ports first
- Current used: `20261` (docker), `20262` (dev)
- Never use `3000`-`3099` range
