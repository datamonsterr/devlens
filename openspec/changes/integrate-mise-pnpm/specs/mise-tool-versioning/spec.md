## ADDED Requirements

### Requirement: Project defines tool versions in mise.toml

The project SHALL contain a `mise.toml` file at the repository root that pins the Node.js, pnpm, and Java versions required for development and build. Each tool version SHALL match versions currently verified as working in the Devlens codebase.

#### Scenario: Developer clones repo and activates mise

- **WHEN** developer runs `cd <project-root>` with mise shell integration active
- **THEN** mise SHALL auto-activate and make the pinned Node.js, pnpm, and Java versions available in PATH

#### Scenario: mise.toml is missing or corrupted

- **WHEN** `mise.toml` is absent or unparseable
- **THEN** `mise install` SHALL report error and agents SHALL fall back to global tool versions with a warning

### Requirement: Mise environment auto-loads on directory entry

The project's mise configuration SHALL be automatically activated when entering the project directory, using mise's shell hook mechanism. No manual `mise trust` or `mise activate` step SHALL be required after initial setup.

#### Scenario: Shell integration enabled

- **WHEN** developer enters the project directory via `cd`
- **THEN** the shell SHALL display a mise activation notice or silently switch tool versions as configured

#### Scenario: Shell integration not enabled

- **WHEN** developer lacks mise shell hook in their shell config (`.bashrc`, `.zshrc`, etc.)
- **THEN** `mise install` and manual `eval "$(mise activate <shell>)"` SHALL be documented as the fallback path

### Requirement: Mise configuration is version-controlled

The `mise.toml` file SHALL be committed to the repository and treated as the single source of truth for project tool versions. All worktrees and CI environments SHALL derive their tool versions from this file.

#### Scenario: New worktree creation

- **WHEN** `git worktree add` creates a new worktree from the repository
- **THEN** the worktree SHALL inherit the same `mise.toml` and tool versions without additional configuration
