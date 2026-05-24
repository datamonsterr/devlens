## ADDED Requirements

### Requirement: Manager invites Developer from Team management
The system SHALL let a Manager invite a Developer by email from Team management and SHALL create a pending or active Team member record for that Developer.

#### Scenario: Manager sends Developer invite
- **WHEN** a Manager submits a Developer email from Team management
- **THEN** the system creates a Developer invitation scoped to the Manager's Team
- **AND** the Developer appears in Team management with invite status

### Requirement: Invitation sends onboarding email
The system SHALL send an onboarding email to the invited Developer with Team context and next steps for accepting the invitation.

#### Scenario: Onboarding email sent
- **WHEN** a Developer invitation is accepted by the backend for delivery
- **THEN** the system sends an onboarding email to the invited email address
- **AND** the email includes the Team name and join instructions

### Requirement: Invitation delivery failure is visible
The system MUST NOT report invite success when Clerk invitation delivery fails.

#### Scenario: Clerk invite fails
- **WHEN** Clerk invitation creation or delivery returns an error
- **THEN** the invite API returns failure
- **AND** Team management shows that the Developer was not successfully invited

### Requirement: Manager-created Developer receives one initial API Key
The system SHALL assign exactly one initial API Key to each Developer created or invited by a Manager through Team management.

#### Scenario: Initial API Key assigned
- **WHEN** a Manager creates or invites a new Developer
- **THEN** the system assigns one initial API Key to that Developer for the Team
- **AND** retrying the same invitation does not create a second initial API Key

### Requirement: Team management shows assigned API Key metadata
The system SHALL show Managers the assigned Developer API Key metadata from Team management without exposing reusable plaintext after the one-time creation response.

#### Scenario: Manager views Developer key metadata
- **WHEN** a Manager opens a Team member row for a Developer
- **THEN** the system shows the assigned API Key name, status, creation date, and safe key identifier
- **AND** the system does not reveal stored plaintext
