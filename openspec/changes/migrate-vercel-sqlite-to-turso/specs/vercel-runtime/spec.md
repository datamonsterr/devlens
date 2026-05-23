## MODIFIED Requirements

### Requirement: Vercel runtime database persistence

Vercel deployments SHALL NOT depend on persistent local `DATA_DIR` database files for production state.

#### Scenario: Vercel production starts
- **WHEN** Devlens runs on Vercel with Turso environment variables configured
- **THEN** all production database access uses Turso/libSQL rather than local filesystem SQLite

#### Scenario: Vercel serverless cold starts concurrently
- **WHEN** multiple Vercel instances cold start after a deploy
- **THEN** startup schema migration coordination prevents concurrent DDL from causing partial migration state or failed requests
