## ADDED Requirements

### Requirement: Developer endpoint view
The system SHALL show developers the team tunnel endpoint used for `/v1/*` API access.

#### Scenario: Developer views endpoint
- **WHEN** a developer opens the endpoint page
- **THEN** the system SHALL show the team tunnel URL and `/v1` base URL

### Requirement: Developer API key self-service
The system SHALL allow developers to create, view metadata for, rotate, and revoke their own API keys.

#### Scenario: Developer creates API key
- **WHEN** a developer creates an API key
- **THEN** the system SHALL show the plaintext API key once and store only a non-plaintext verifier

#### Scenario: Developer lists API keys
- **WHEN** a developer lists API keys after creation
- **THEN** the system SHALL show API key metadata without exposing plaintext values

### Requirement: Developer model browser
The system SHALL allow developers to view models and combos configured by the team manager.

#### Scenario: Developer views combos
- **WHEN** a developer opens the models page
- **THEN** the system SHALL show available combos and model information for the developer's team

#### Scenario: Developer modifies combo
- **WHEN** a developer attempts to modify a combo
- **THEN** the system SHALL deny the operation

### Requirement: Developer CLI Config Snippets
The system SHALL provide developers CLI Config Snippets for supported tools using the team endpoint and a developer API key.

#### Scenario: Developer opens CLI Config Snippet
- **WHEN** a developer selects a CLI tool
- **THEN** the system SHALL show configuration using the team `/v1` base URL and a developer API key entry path

### Requirement: Developer account settings
The system SHALL allow developers to manage their own account settings without changing team settings.

#### Scenario: Developer updates account setting
- **WHEN** a developer updates an account setting
- **THEN** the system SHALL save the setting only for that developer

### Requirement: Developer console logs
The system SHALL allow developers to view safe console logs for debugging without exposing credentials or other developers' secrets.

#### Scenario: Developer views console logs
- **WHEN** a developer opens console logs
- **THEN** the system SHALL show masked log entries available to that developer
