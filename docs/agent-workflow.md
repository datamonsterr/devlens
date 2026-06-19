# Agent workflow

## Before work

1. Read `CONTEXT.md`.
2. Read `docs/living_spec.md`.
3. Read `docs/features.md`.
4. Read relevant `docs/feature_spec/*.md`.
5. Read relevant `docs/technical_spec/*.md`.
6. If complex, use `grill-with-docs`.
7. Create separate worktree under `worktrees/` before implementation.

## During work

- Use domain language exactly: Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, CLI Config Snippet.
- Treat OpenSpec/living specs as target direction when current code still has 9router residue.
- Keep docs and code synced.

## After work

- Update affected specs.
- Run setup/build/lint/typecheck/test commands available for task.
- Do not commit unless user asks.
