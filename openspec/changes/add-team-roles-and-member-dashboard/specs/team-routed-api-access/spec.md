## ADDED Requirements

### Requirement: API key authenticated routing
The system SHALL authenticate `/v1/*` requests with a developer API key before routing to any provider.

#### Scenario: Valid developer API key request
- **WHEN** a `/v1/*` request includes a valid active developer API key
- **THEN** the system SHALL route the request with that developer's `teamId` and `userId`

#### Scenario: Invalid API key request
- **WHEN** a `/v1/*` request includes a missing, invalid, inactive, or revoked API key
- **THEN** the system SHALL reject the request before provider resolution

### Requirement: Shared team endpoint
The system SHALL allow all developers in a team to use the same team tunnel endpoint while preserving per-developer identity through API keys.

#### Scenario: Two developers use same endpoint
- **WHEN** two developers send requests to the same team tunnel endpoint with different API keys
- **THEN** the system SHALL route both through the same team resources and attribute each request to the correct developer

### Requirement: Team-scoped provider resolution
The system SHALL resolve provider connections, combos, model aliases, pricing overrides, and RTK Pool from the authenticated API key's team.

#### Scenario: Developer requests combo
- **WHEN** a developer requests a combo by name
- **THEN** the system SHALL resolve the combo only from that developer's team

#### Scenario: Cross-team provider exists
- **WHEN** another team has a provider connection for the same provider
- **THEN** the system SHALL NOT use that provider connection for the developer's request

### Requirement: Team-scoped RTK accounting
The system SHALL decrement RTK Pool savings from the authenticated developer's team during streaming requests when RTK applies.

#### Scenario: RTK compresses tool output
- **WHEN** RTK compresses tool output for a developer request
- **THEN** the system SHALL decrement the RTK Pool for that developer's team

### Requirement: Request attribution
The system SHALL persist usage and routing records with both team and developer identity.

#### Scenario: Request completes
- **WHEN** a `/v1/*` request completes successfully or fails after routing
- **THEN** the system SHALL record usage with `teamId`, `userId`, endpoint, provider, model, status, token counts, and cost where available
