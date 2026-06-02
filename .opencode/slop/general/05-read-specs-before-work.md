# Implement without reading living specs

**Severity**: critical
**Layer**: general

## What went wrong

Agent started implementing a feature without reading the relevant `docs/{feature}/feature_spec.md` and `docs/{feature}/technical.md` first.

## What should have happened

Before implementation:
1. Read `docs/README.md` for orientation
2. Read `docs/{feature}/feature_spec.md` for requirements
3. Read `docs/{feature}/technical.md` for implementation constraints
4. Read relevant cross-cutting docs (architecture, auth, schema)
5. Read `.opencode/slop/` entries for the feature area

## Why it matters

AGENTS.md rule 8: living specs are source of truth. Implementing without reading specs leads to code that contradicts the documented direction. OpenSpec decisions win over current code for target direction.

## How to avoid

- Use `living-spec-reader` agent before every task
- Use `slop-reader` agent before every task
- Check `docs/features.md` for feature inventory
- Never trust code alone — specs define target, code may be 9router residue
