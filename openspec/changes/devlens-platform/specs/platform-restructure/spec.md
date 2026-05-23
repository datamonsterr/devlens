## ADDED Requirements

### Requirement: Centralized SQLite Database

The system SHALL use a single SQLite database file for all persistent state. This replaces the previous model of multiple JSON files (`db.json`, `usage.json`, `log.txt`) stored under `~/.9router/`.

#### Scenario: Database initialization
- **WHEN** the application starts
- **THEN** the system opens or creates the SQLite database at `DATA_DIR/devlens.db` (or a configured path)

#### Scenario: Schema migration on startup
- **WHEN** the application starts and the database exists but has an outdated schema
- **THEN** the system runs pending migrations to bring the schema up to date

### Requirement: Multi-Tenant Data Isolation

All data queries SHALL be scoped by `team_id`. A request from a user in Team A SHALL never return data from Team B. The `team_id` SHALL be a column on every tenant-scoped table.

#### Scenario: Cross-tenant query prevention
- **WHEN** a query for providers includes `WHERE team_id = ?`
- **THEN** only records with the matching team_id are returned

#### Scenario: Missing team context
- **WHEN** a data access function is called without a team_id
- **THEN** the function throws an error "Team context required"

### Requirement: Removal of CLI Tools Module

The `cli/` directory and all `src/app/api/cli-tools/*` routes SHALL be deleted. No CLI tool configuration functionality SHALL remain in the codebase.

#### Scenario: Old CLI route accessed
- **WHEN** a request is sent to `/api/cli-tools/*`
- **THEN** the system returns HTTP 404 (route no longer exists)

#### Scenario: CLI package import attempted
- **WHEN** code attempts to import from `../../cli/`
- **THEN** the import fails at build time (directory deleted)

### Requirement: Removal of MITM Module

The `src/mitm/` directory and all MITM-related API routes SHALL be deleted. The `server-init.js` SHALL no longer reference or start the MITM server. The Dockerfile SHALL no longer copy MITM files.

#### Scenario: MITM server not started
- **WHEN** the application starts
- **THEN** no MITM proxy server is initialized

#### Scenario: Dockerfile does not copy MITM
- **WHEN** the Docker image is built
- **THEN** no MITM files are included in the image

### Requirement: Removal of Cloud Sync

The cloud sync modules (`src/lib/initCloudSync.js`, `src/shared/services/cloudSyncScheduler.js`, `src/app/api/sync/*`, `src/app/api/cloud/*`) SHALL be deleted. The application SHALL not attempt to sync data with any external cloud service.

#### Scenario: Cloud sync not initialized
- **WHEN** the application starts
- **THEN** no cloud sync scheduler is started

#### Scenario: Sync API route accessed
- **WHEN** a request is sent to `/api/sync/*`
- **THEN** the system returns HTTP 404

### Requirement: Removal of Chinese and Vietnamese Documentation

The files `README.zh-CN.md`, `README.vi.md`, `README.ja-JP.md` and directory `i18n/` SHALL be deleted.

#### Scenario: Chinese README accessed
- **WHEN** a user tries to view `README.zh-CN.md`
- **THEN** the file does not exist in the repository

### Requirement: Docker Compose

The repository SHALL include a `docker-compose.yml` that defines the Devlens application service with a mounted volume for SQLite data persistence, suitable for local development and testing.

#### Scenario: Starting local environment
- **WHEN** a developer runs `docker compose up`
- **THEN** the Devlens application starts on port 20261 with a persistent data volume

#### Scenario: Data persists across restarts
- **WHEN** `docker compose down` then `docker compose up` is run
- **THEN** previously created teams, users, and settings are still present

### Requirement: Brand Rename

All occurrences of "9Router", "9router", and "9Router-app" in code, configuration, documentation, and Docker metadata SHALL be renamed to "Devlens", "devlens", and "devlens-app" respectively.

#### Scenario: Package name reflects Devlens
- **WHEN** reading `package.json`
- **THEN** `name` is `devlens-app` and `description` references Devlens

#### Scenario: Docker image label
- **WHEN** inspecting the built Docker image
- **THEN** `org.opencontainers.image.title` is `devlens`

### Requirement: UI Color Theme

The application's color scheme SHALL use a blue-purple palette instead of the previous orange theme. Tailwind CSS configuration SHALL define blue and purple as primary colors.

#### Scenario: Primary buttons
- **WHEN** a primary action button is rendered
- **THEN** it uses a blue or purple background color, not orange

#### Scenario: Brand accent elements
- **WHEN** header, sidebar, or brand elements are rendered
- **THEN** they use blue-purple gradient or solid colors

### Requirement: Documentation Restructure

The repository SHALL include `docs/feature_spec/` with one file per use case and `docs/technical_spec/` with architecture overview, high-level design, tech stack, and conventions. The `gitbook/` directory SHALL be repurposed as a Devlens documentation site.

#### Scenario: Feature spec files exist
- **WHEN** listing `docs/feature_spec/`
- **THEN** one markdown file exists per feature use case

#### Scenario: Technical spec files exist
- **WHEN** listing `docs/technical_spec/`
- **THEN** files exist for architecture, high-level design, tech stack, and conventions

### Requirement: CLI Config Snippets

The system SHALL provide copyable configuration snippets on the developer-facing UI for three CLI tools: Claude Code, OpenCode, and Codex. Each snippet SHALL show the API base URL and the developer's API key in the tool's native config format. No automated config-file writing SHALL exist.

#### Scenario: Developer copies config snippet
- **WHEN** a developer navigates to the API keys or model browser page
- **THEN** they see a "CLI Configuration" section with tabs for Claude Code, OpenCode, and Codex, each showing a copyable snippet with the API base URL and their selected API key

#### Scenario: Developer copies API key to clipboard
- **WHEN** a developer clicks the copy button next to a snippet
- **THEN** the snippet text is copied to clipboard and a confirmation toast appears

### Requirement: Test Suite Compatibility

All existing tests SHALL be updated to reference the new module structure, renamed brands, and new auth model. Removed module tests SHALL be deleted. The full test suite SHALL pass.

#### Scenario: Running test suite
- **WHEN** `npm test` is executed
- **THEN** all tests pass with zero failures

#### Scenario: Test references old modules
- **WHEN** the test suite runs
- **THEN** no tests reference `cli/`, `src/mitm/`, or `cli-tools` routes
