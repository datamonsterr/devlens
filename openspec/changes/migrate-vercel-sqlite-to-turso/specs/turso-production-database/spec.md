## ADDED Requirements

### Requirement: Turso production database

The system SHALL use Turso/libSQL as the durable production database when deployed to Vercel with `TURSO_DATABASE_URL` configured.

#### Scenario: Vercel production uses Turso
- **WHEN** Devlens starts in Vercel with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- **THEN** database reads and writes use the configured Turso database instead of local `DATA_DIR` SQLite storage

#### Scenario: Production data persists across invocations
- **WHEN** two serverless invocations access Team data, Provider Connections, API Keys, Combos, Model Aliases, Pricing Overrides, RTK Pool state, usage, or request logs
- **THEN** both invocations read and write the same durable Turso database
