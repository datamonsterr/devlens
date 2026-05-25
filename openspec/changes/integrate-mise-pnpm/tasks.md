## 1. Mise configuration

- [x] 1.1 Create `mise.toml` at project root with `[tools]` section pinning node 25.9.0, pnpm (latest via mise backend), and java temurin-21
- [x] 1.2 Add `[settings]` section to mise.toml with `trusted_config_paths` and `activate_aggressive = true` for auto-load on directory entry
- [x] 1.3 Run `mise install` to provision pinned tool versions
- [x] 1.4 Verify `mise current` shows node, pnpm, and java all active at correct versions

## 2. pnpm workspace setup

- [x] 2.1 Install pnpm via mise pnpm backend; if backend unavailable, fallback to `corepack enable pnpm`
- [x] 2.2 Create `pnpm-workspace.yaml` at project root listing `tests/`, `gitbook/`, `.opencode/`
- [x] 2.3 Add `"packageManager": "pnpm@<version>"` field to root `package.json` for Corepack compatibility
- [x] 2.4 Create `.npmrc` with `engine-strict=true` to enforce Node.js version at install time

## 3. Cleanup npm artifacts

- [x] 3.1 Remove all `node_modules/` directories (root, tests/, gitbook/, .opencode/)
- [x] 3.2 Remove `package-lock.json` and any other npm lock artifacts from all package directories
- [x] 3.3 Run `pnpm install` at project root to regenerate node_modules with pnpm

## 4. Script migration from npx to pnpm

- [x] 4.1 Update root `package.json` scripts: `npx eslint` → `eslint`, add `pnpm` to test/typecheck scripts as needed
- [x] 4.2 Update `tests/package.json` scripts: `npx vitest` → `vitest`, `npx vitest --reporter=verbose` → `vitest run --reporter=verbose`
- [x] 4.3 Update `gitbook/package.json` deploy script: `npx wrangler` → `pnpm dlx wrangler`

## 5. AGENTS.md rules update

- [x] 5.1 Replace `npm install` with `pnpm install` in worktree setup step 3
- [x] 5.2 Add rule: "Always use `pnpm` for package management: `pnpm install`, `pnpm add`, `pnpm remove`. Never use npm."
- [x] 5.3 Add rule: "Use `pnpm dlx` instead of `npx` for one-shot tool execution."

## 6. Verification

- [x] 6.1 Run `pnpm install` from root and confirm all workspace dependencies resolve without errors
- [x] 6.2 Run `pnpm lint` and confirm ESLint executes without npx wrapper
- [x] 6.3 Run `pnpm test` and confirm Vitest executes from tests workspace
- [x] 6.4 Verify `mise current` or `eval "$(mise activate bash)"` activates tool versions on directory entry
- [x] 6.5 Run `pnpm dev` and confirm Next.js starts on port 20262
