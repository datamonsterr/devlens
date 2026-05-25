## ADDED Requirements

### Requirement: pnpm replaces npm as the package manager

The project SHALL use pnpm exclusively for dependency management across all workspaces. npm SHALL NOT be used for install, run, or exec operations within this repository.

#### Scenario: Initial dependency installation

- **WHEN** developer runs `pnpm install` at project root
- **THEN** all dependencies across root, tests/, gitbook/, and .opencode/ workspaces SHALL be installed from pnpm-lock.yaml

#### Scenario: Agent sets up worktree

- **WHEN** agent follows AGENTS.md worktree setup steps
- **THEN** agent SHALL run `pnpm install` instead of `npm install`

### Requirement: pnpm workspace configuration

The project SHALL define a `pnpm-workspace.yaml` at the repository root that declares all sub-packages whose dependencies SHALL be managed by pnpm. Workspace members SHALL include `tests/`, `gitbook/`, and `.opencode/`.

#### Scenario: Dependency hoisting across workspaces

- **WHEN** `pnpm install` runs at root
- **THEN** shared dependencies across workspaces SHALL be hoisted to the root node_modules/.pnpm store for disk efficiency

### Requirement: Scripts use pnpm dlx instead of npx

All `package.json` scripts that invoke one-shot tool execution SHALL use `pnpm dlx` instead of `npx`. Direct binary invocations SHALL be preferred where the tool is already a project dependency.

#### Scenario: Running eslint via lint script

- **WHEN** developer runs `pnpm lint`
- **THEN** eslint SHALL execute using the project-installed ESLint binary without downloading or resolving a separate version

#### Scenario: Running vitest via test script

- **WHEN** developer runs `pnpm test`
- **THEN** vitest SHALL execute using the workspace-installed vitest binary

### Requirement: AGENTS.md enforces pnpm usage

The AGENTS.md file SHALL instruct agents to use `pnpm` for all package management operations and `pnpm dlx` for one-shot tool execution. References to `npm` and `npx` SHALL be replaced.

#### Scenario: Agent reads worktree setup instructions

- **WHEN** agent reads AGENTS.md step 3 for worktree setup
- **THEN** instructions SHALL state `pnpm install` instead of `npm install`

#### Scenario: Agent needs to run a one-shot tool

- **WHEN** agent determines it needs to run a tool not installed as a project dependency
- **THEN** agent SHALL use `pnpm dlx` according to AGENTS.md rule
