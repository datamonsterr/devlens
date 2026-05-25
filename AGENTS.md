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
7. Treat `docs/` living specs as the source of truth for Devlens product and technical direction.
8. Read `docs/living_spec/README.md`, `docs/living_spec/features.md`, and relevant `docs/living_spec/feature_spec/*.md` / `docs/living_spec/technical_spec/*.md` before working on proposals or implementation.
9. OpenSpec decisions win over current 9router residue when code and docs disagree about target Devlens direction.
10. Update and sync living specs in `docs/` after finishing any proposal or implementation that changes behavior, architecture, schema, routes, auth, or agent workflow.
11. Use `.opencode/agents/living-spec-reader.md` to inspect specs before work and `.opencode/agents/living-spec-syncer.md` to sync specs after work.

## Domain language

Use project language from `CONTEXT.md`: Team, Manager, Developer, API Key, Provider Connection, Combo, RTK Pool, Model Alias, Pricing Override, CLI Config Snippet.
