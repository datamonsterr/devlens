## ADDED Requirements

### Requirement: Manager overview dashboard
The system SHALL provide team managers an overview dashboard for team-wide usage and activity.

#### Scenario: Manager views overview
- **WHEN** a manager opens the overview dashboard
- **THEN** the system SHALL show team-wide requests, tokens, costs, models, providers, and recent activity where data is available

### Requirement: Manager per-developer usage
The system SHALL allow managers to view usage broken down by developer for their team.

#### Scenario: Manager views developer usage
- **WHEN** a manager opens usage analytics
- **THEN** the system SHALL show usage totals grouped by developer for the manager's team

#### Scenario: Manager views another team
- **WHEN** a manager attempts to view usage for another team
- **THEN** the system SHALL deny access

### Requirement: Developer personal usage
The system SHALL allow developers to view only their own usage.

#### Scenario: Developer views usage
- **WHEN** a developer opens usage
- **THEN** the system SHALL show only usage attributed to that developer

#### Scenario: Developer requests team usage
- **WHEN** a developer attempts to view team-wide or another developer's usage
- **THEN** the system SHALL deny access

### Requirement: Usage source consistency
The system SHALL derive dashboard usage from the same persisted usage events created by `/v1/*` API requests.

#### Scenario: API request is recorded
- **WHEN** a developer completes a `/v1/*` API request
- **THEN** the system SHALL make that request visible in manager team usage and developer personal usage according to role permissions
