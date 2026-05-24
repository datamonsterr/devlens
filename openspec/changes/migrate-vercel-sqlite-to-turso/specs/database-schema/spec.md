## MODIFIED Requirements

### Requirement: Database schema migrations

The system SHALL run versioned schema migrations and additive schema sync against both local SQLite and Turso/libSQL adapters.

#### Scenario: Local SQLite schema migration
- **WHEN** the application starts with local SQLite and the schema is outdated
- **THEN** pending migrations run in monotonic order and update the schema version

#### Scenario: Turso schema migration
- **WHEN** the application starts with Turso configured and the schema is outdated
- **THEN** one migration runner applies pending migrations while concurrent startup attempts wait, skip, or fail safely without corrupting migration state

#### Scenario: Unsupported Turso pragmas
- **WHEN** migration code encounters SQLite pragmas unsupported by Turso/libSQL
- **THEN** the adapter ignores or handles them without failing schema initialization
