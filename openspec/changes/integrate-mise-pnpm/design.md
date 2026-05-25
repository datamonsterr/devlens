## Context

Devlens currently uses npm as its package manager with no tool-version pinning. Node.js version is implicitly whatever the host provides. Multiple `package.json` files exist across root, `tests/`, `gitbook/`, and `.opencode/` directories, managed independently. `mise` 2026.3.17 is available in the host environment but no `.mise.toml` or `.tool-versions` exists in the repository. AGENTS.md step 3 instructs agents to run `npm install` during worktree setup.

## Goals / Non-Goals

**Goals:**
- Pin Node.js (25.9.0), pnpm, and Java (temurin-21) versions via `mise.toml` for reproducible environments
- Migrate all `package.json` scripts from `npx` to direct binary calls or `pnpm dlx`
- Define pnpm workspace spanning root, tests/, gitbook/, .opencode/ for single-command installs
- Update AGENTS.md to enforce pnpm usage for agents

**Non-Goals:**
- Change any application code, routes, or API behavior
- Upgrade/downgrade dependency versions
- Touch CI/CD pipelines (out of scope for this change)
- Migrate gitbook/ or .opencode/ to use the workspace's shared deps (keep independent for now)
- Convert `next.config.mjs` from webpack to turbopack

## Decisions

### 1. mise.toml as single tool-version source
**Choice**: `mise.toml` at repo root with `[tools]` section.
**Why**: mise natively supports TOML format with richer configuration than legacy `.tool-versions` format. TOML allows comments, environment variables, and per-directory overrides.
**Alternatives considered**: `.tool-versions` (simpler but less expressive), `.nvmrc` + manual pnpm install (more manual, less integrated).

### 2. pnpm installation via mise backend
**Choice**: Let mise manage pnpm version via its built-in `pnpm` backend. If backend unavailable, fall back to `corepack enable pnpm` (bundled with Node.js 25.x).
**Why**: Single tool (mise) manages every version dependency. `pnpm` backend fetches and caches pnpm binaries under mise's shim directory.
**Alternatives considered**: `npm install -g pnpm` (pollutes global scope, not version-pinned), `corepack` only (requires separate `packageManager` field in package.json, conflicts with mise philosophy).

### 3. pnpm workspace spanning all packages
**Choice**: `pnpm-workspace.yaml` lists `tests/`, `gitbook/`, `.opencode/` as workspace members. Root `package.json` remains the anchor.
**Why**: Single `pnpm install` at root resolves all dependencies. Hoisting de-duplicates shared packages (e.g., React 19 across root and gitbook). Next.js standalone output with `outputFileTracingRoot` already handles monorepo layout.
**Trade-off**: gitbook uses slightly different React/Next.js versions (19.2.3 vs 19.2.4, Next 16.1.1 vs 16.1.6). pnpm workspace hoisting may surface version conflicts. Mitigation: pnpm's strict resolution will flag them; we keep independent `package.json` versions and let pnpm deduplicate where safe.

### 4. Script migration: direct binaries over pnpm dlx
**Choice**: Replace `npx eslint` with `eslint` (direct), `npx vitest` with `vitest` (direct), `npx wrangler` with `pnpm dlx wrangler`.
**Why**: ESLint and Vitest are project devDependencies — direct binary invocation is faster and avoids npx download latency. Wrangler is not a dependency — `pnpm dlx` is the idiomatic pnpm equivalent of `npx`.
**Alternatives considered**: Keep `npx` everywhere (pragmatic but violates pnpm-only rule, npx defaults to npm registry resolution which may conflict with pnpm lockfile).

### 5. Node.js version: keep current global
**Choice**: Pin `node = "25.9.0"` in mise.toml.
**Why**: This is the Node.js version currently running the project successfully. Upgrading or downgrading Node.js is a separate concern.
**Risk**: Node 25.x is odd-numbered (non-LTS). Mitigation: pin exact version, not range. Revisit when an even-numbered LTS is needed.

## Risks / Trade-offs

- **[pnpm not installed on developer machine]** → mise.toml declares pnpm dependency; `mise install` fetches it. If mise pnpm backend fails, documented fallback: `corepack enable pnpm && corepack prepare pnpm@latest --activate`
- **[pnpm workspace version conflicts (React/Next across sub-packages)]** → pnpm strict mode catches these at install time. Sub-packages with incompatible versions can be excluded from workspace or have `pnpm.overrides` applied.
- **[Removing node_modules deletes optional native modules (better-sqlite3)]** → `pnpm install` will rebuild them. If build fails, sql.js fallback handles runtime.
- **[Agent still uses npm after migration]** → AGENTS.md rule is self-reinforcing; agents reading AGENTS.md will see pnpm requirement. Risk of stale npm habits in agent memory persists until all agents relearn.

## Migration Plan

1. Create `mise.toml` with tool versions → `mise install` → verify with `mise current`
2. Create `pnpm-workspace.yaml` → remove `node_modules/` and npm lockfiles → `pnpm install`
3. Update scripts in all `package.json` files
4. Update AGENTS.md
5. Verify: `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm dev` all work
6. Commit all changes

**Rollback**: Revert AGENTS.md and package.json script changes. Delete `mise.toml` and `pnpm-workspace.yaml`. Run `npm install` to restore npm lockfile. Roleback is trivial — no data migration, no schema changes.

## Open Questions

- Should we add `package.json#packageManager` field (`"pnpm@<version>"`) for Corepack compatibility in addition to mise? (Recommend: yes, for non-mise users)
- Should gitbook/ remain in workspace given its different framework version constraints? (Recommend: keep in workspace, monitor for conflicts)
- Should we add a `.npmrc` with `engine-strict=true`? (Recommend: yes, to enforce Node version at install time)
