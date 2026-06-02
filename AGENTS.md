# AGENTS.md

Project guidance for agents working in Devlens.

## MUST FOLLOW

1. Use `grill-with-docs` when assigned tasks are complex.
2. Always create a separate worktree under the project root `./worktrees/` before doing implementation work.
3. Set up the project inside that worktree so it can run and be tested manually:
   1. Create worktree from the project root, for example: `git worktree add ./worktrees/<task-name> -b <task-branch>`
   2. Copy `.env` from the main worktree into the new worktree.
   3. Run `pnpm install` in the new worktree.
   4. Run project setup, build, lint, typecheck, and test commands needed for the task.
4. Always use `pnpm` for package management: `pnpm install`, `pnpm add`, `pnpm remove`. Never use npm.
5. Use `pnpm dlx` instead of `npx` for one-shot tool execution.
6. Rename/name all ports used by this project to the `2026x` range, for example `20261`, `20262`, to avoid current 9router ports.
7. Treat `docs/` as the source of truth for Devlens product and technical direction.
8. Read `.opencode/slop/` entries before any implementation to avoid known mistakes.
9. Read `docs/README.md` for navigation, then read `docs/{feature}/feature_spec.md` and `docs/{feature}/technical.md` before working on proposals or implementation.
10. OpenSpec decisions win over current 9router residue when code and docs disagree about target Devlens direction.
11. Update and sync docs after finishing any proposal or implementation that changes behavior, architecture, schema, routes, auth, or agent workflow.
12. Use `.opencode/agents/living-spec-reader.md` to inspect specs before work and `.opencode/agents/living-spec-syncer.md` to sync specs after work.
13. Use `.opencode/agents/slop-reader.md` to load mistake log before work.
14. Record discovered mistake patterns with `/slop` command — write to `.opencode/slop/`.

## Domain language

Use project language from `CONTEXT.md`: Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, CLI Config Snippet.

## Before implementation checklist

```
[ ] Read docs/README.md
[ ] Read docs/{feature}/feature_spec.md
[ ] Read docs/{feature}/technical.md
[ ] Load .opencode/slop/ entries (slop-reader agent)
[ ] Read relevant cross-cutting docs (architecture, auth, schema)
[ ] Create worktree under ./worktrees/
[ ] Copy .env into worktree
[ ] Run pnpm install in worktree
```

## After implementation checklist

```
[ ] Update docs/{feature}/feature_spec.md if behavior changed
[ ] Update docs/{feature}/technical.md if architecture changed
[ ] Record discovered mistakes via /slop
[ ] pnpm build && pnpm lint && pnpm test
[ ] Sync docs (living-spec-syncer agent)
```

## Docs structure

```
docs/
  README.md                    ← Start here for navigation
  features.md                  ← Feature inventory
  architecture.md              ← System architecture
  database-schema.md           ← Schema and migrations
  api-route-map.md             ← API route catalog
  sse-routing-core.md          ← Provider routing engine
  testing.md                   ← Test strategy
  {feature}/                   ← Per-feature folder
    feature_spec.md            ← Feature requirements
    technical.md               ← Implementation details
  adr/                         ← Architecture Decision Records
  sqlite-to-turso.md           ← Turso migration runbook
```

## Slop system

```
.opencode/slop/
  README.md                    ← System design
  TEMPLATE.md                  ← Entry template
  general/                     ← Cross-cutting mistakes
    NN-slug.md
  features/                    ← Feature-specific pitfalls
    {name}/
      NN-slug.md
```

**Commands**: `/slop` records a mistake.
**Agents**: `slop-reader` loads before work, `slop-writer` creates entries.
