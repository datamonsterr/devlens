## ADDED Requirements

### Requirement: Database runtime selection

The system SHALL select the database adapter from environment configuration, using Turso/libSQL when `TURSO_DATABASE_URL` is present and local SQLite otherwise.

#### Scenario: Turso environment configured
- **WHEN** `TURSO_DATABASE_URL` is set
- **THEN** the application initializes the libSQL adapter with `TURSO_AUTH_TOKEN` when required

#### Scenario: Turso environment absent
- **WHEN** `TURSO_DATABASE_URL` is not set
- **THEN** the application uses the existing local SQLite fallback chain for development and self-hosted deployments

#### Scenario: Turso mode avoids local filesystem assumptions
- **WHEN** the libSQL adapter is selected
- **THEN** the application does not require writable local SQLite files, WAL checkpoint timers, or local database process signal handling
