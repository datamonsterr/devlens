## ADDED Requirements

### Requirement: Manager team roster
The system SHALL allow team managers to view and manage developers in their team.

#### Scenario: Manager views roster
- **WHEN** a manager opens team management
- **THEN** the system SHALL show developers in the manager's team with role, status, and API key metadata

#### Scenario: Developer opens team management
- **WHEN** a developer attempts to access team management
- **THEN** the system SHALL deny access

### Requirement: Developer invitations
The system SHALL allow team managers to invite developers to their team.

#### Scenario: Manager sends invitation
- **WHEN** a manager invites a developer
- **THEN** the system SHALL create an invitation associated with the manager's team

### Requirement: Manager API key oversight
The system SHALL allow team managers to inspect API key metadata and revoke developer API keys for their team.

#### Scenario: Manager revokes developer API key
- **WHEN** a manager revokes an active developer API key
- **THEN** the system SHALL deactivate that API key for future `/v1/*` requests

#### Scenario: Manager views API key metadata
- **WHEN** a manager views API keys
- **THEN** the system SHALL show metadata without exposing plaintext API key values

### Requirement: Manager-only team settings
The system SHALL restrict provider connections, combos, pricing overrides, RTK Pool settings, and team settings to managers.

#### Scenario: Developer attempts provider configuration
- **WHEN** a developer attempts to modify provider connections, combos, pricing overrides, RTK Pool settings, or team settings
- **THEN** the system SHALL deny the operation
