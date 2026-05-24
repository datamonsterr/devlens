## ADDED Requirements

### Requirement: Initial Developer API Key from Team management
The system SHALL support one initial API Key assigned by Team management when a Manager creates or invites a Developer.

#### Scenario: Developer joins with assigned API Key
- **WHEN** an invited Developer accepts the Team invitation and opens API Keys
- **THEN** the system shows the assigned initial API Key metadata for that Developer
- **AND** the API Key belongs to the Developer and Team

### Requirement: API Key plaintext remains one-time
The system MUST store only the API Key HMAC hash and MUST NOT show reusable plaintext after initial creation.

#### Scenario: API Key viewed after creation
- **WHEN** a Manager or Developer views the assigned API Key after the creation response has ended
- **THEN** the system shows only metadata and safe key identifiers
- **AND** the system does not reveal reusable plaintext

### Requirement: Initial API Key assignment is idempotent
The system SHALL prevent duplicate initial API Keys for the same Developer and Team when invitation or creation is retried.

#### Scenario: Invite retried
- **WHEN** a Manager retries invitation for the same Developer email in the same Team
- **THEN** the system reuses the existing initial API Key assignment
- **AND** the system does not create another initial API Key
