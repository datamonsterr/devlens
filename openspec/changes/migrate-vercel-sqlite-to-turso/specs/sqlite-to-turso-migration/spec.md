## ADDED Requirements

### Requirement: SQLite to Turso migration workflow

The system SHALL provide explicit operator-run scripts to export an existing local SQLite database, import it into Turso, and verify migrated data.

#### Scenario: Operator runs migration preflight
- **WHEN** an operator runs the migration script in dry-run or preflight mode
- **THEN** the script validates the source SQLite database, target Turso configuration, and planned table counts without mutating target data

#### Scenario: Import targets non-empty Turso database
- **WHEN** the operator runs the import script against a Turso database that already contains data
- **THEN** the script fails fast by default before inserting or overwriting rows

#### Scenario: Operator verifies migration
- **WHEN** the import completes
- **THEN** the verification script reports source and target row counts for key tables
