# Use npm instead of pnpm

**Severity**: common
**Layer**: general

## What went wrong

Agent used `npm install` or `npx` command when the project requires `pnpm`.

## What should have happened

Always use `pnpm` for all package operations:
- `pnpm install` (not npm install)
- `pnpm add <pkg>` (not npm install <pkg>)
- `pnpm remove <pkg>` (not npm uninstall <pkg>)
- `pnpm dlx <tool>` (not npx <tool>)
- `pnpm run <script>` (not npm run <script>)

## Why it matters

Project has `engine-strict=true` in `.npmrc`. npm commands create wrong lockfiles and break the workspace. The `pnpm-workspace.yaml` defines the workspace structure that npm cannot process.

## How to avoid

- Check `AGENTS.md` rule 4: "Always use pnpm for package management"
- Check `CONTEXT.md` for tooling preferences
- Read `.npmrc` to confirm `engine-strict=true`
