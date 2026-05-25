## Why

Devlens lacks reproducible tool-version management across worktrees and contributors. Node/npm versions drift silently, `npx` invocations bypass deterministic dependency resolution, and AGENTS.md enforces `npm install` without a lock on which Node/npm version. Adding mise provides per-project tool pinning; switching to pnpm gives faster, deterministic installs with strict dependency resolution.

## What Changes

- Initialize `mise.toml` with pinned Node.js (from current global `25.9.0`), pnpm, and java versions used by this project
- Install pnpm globally (via mise plugin or corepack) and make it available in mise-managed PATH
- Enable mise auto-load on directory entry for this project (mise hook + shell integration)
- Migrate from npm to pnpm: remove `node_modules/`, any npm lockfiles, reinstall with pnpm across all 4 package.json workspaces (root, tests/, gitbook/, .opencode/)
- Update AGENTS.md: replace `npm install` with `pnpm install`, replace `npx` with `pnpm dlx`, add rule to always use pnpm
- Update root `package.json` scripts: replace `npx` invocations with `pnpm dlx` or direct binary calls
- Add `pnpm-workspace.yaml` to define workspaces

## Capabilities

### New Capabilities
- `mise-tool-versioning`: mise.toml pins Node.js, pnpm, and java versions for deterministic dev environments across worktrees and contributors
- `pnpm-package-manager`: pnpm replaces npm as the project package manager with workspace support, strict dependency resolution, and faster installs

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- Root `package.json`: script command changes (`npx` → direct/pnpm dlx)
- `AGENTS.md`: worktree setup rule updated from `npm` to `pnpm`
- `tests/package.json`: test scripts updated from `npx` to `pnpm dlx`
- `gitbook/package.json`: deploy script `npx wrangler` → `pnpm dlx wrangler`
- New files: `mise.toml`, `pnpm-workspace.yaml`
- Removed: `node_modules/`, any `package-lock.json` or npm lock artifacts
- Developer workflow: must `cd` into project (mise auto-activates) before running commands
- **BREAKING**: Existing `node_modules/` and npm lockfiles removed; developers must run `pnpm install` after pull
