## ADDED Requirements

### Requirement: Manager API Key creation moves to Team management
The system SHALL remove standalone Manager-facing API Key creation and expose Manager-created Developer key assignment only through Team management.

#### Scenario: Manager looks for API Key creation
- **WHEN** a Manager opens dashboard navigation
- **THEN** no standalone create API Key tab is shown for the Manager
- **AND** Team management provides the Developer invitation and assigned API Key flow

### Requirement: Developer self-service API Key access remains available
The system SHALL continue to let Developers view and manage their own API Keys according to Developer permissions.

#### Scenario: Developer opens API Keys
- **WHEN** a Developer opens the API Keys page
- **THEN** the Developer can see their assigned API Key metadata
- **AND** the Developer can use allowed self-service actions for own keys
