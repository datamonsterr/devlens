# Living Specs (Legacy Index)

`docs/living_spec/` is the legacy index for Devlens living specs.

## Docs have been restructured

Feature specs and technical docs now live in per-feature folders under `docs/`:

```
docs/
  README.md              ← Start here for navigation
  clerk-auth/            ← feature_spec.md + technical.md
  cli-config-snippets/   ← feature_spec.md + technical.md
  combos/                ← feature_spec.md + technical.md
  ...
```

Cross-cutting technical specs are at `docs/` root:
- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/sse-routing-core.md`
- etc.

See [docs/README.md](../README.md) for full documentation map.

## Rules (unchanged)

- Read relevant `docs/{feature}/feature_spec.md` and `docs/{feature}/technical.md` before proposals or implementation.
- OpenSpec wins over current code when documenting migration direction.
- Update specs after each accepted proposal or implementation.
- Keep specs synced with `CONTEXT.md` domain language.
