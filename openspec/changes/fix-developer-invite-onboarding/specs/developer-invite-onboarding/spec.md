## ADDED Requirements

### Requirement: Developer invite sends onboarding email
The system SHALL send an onboarding email after a Manager successfully invites a Developer and local pending Team state exists. The email MUST include a sign-in URL and the canonical Devlens API base URL.

#### Scenario: Successful invite email
- **WHEN** a Manager invites a Developer by email and Clerk invitation creation succeeds
- **THEN** the system creates or reuses pending Developer Team state, assigns the initial API Key idempotently, and sends one onboarding email containing sign-in URL and API base URL

#### Scenario: Email dispatch failure
- **WHEN** onboarding email dispatch fails after Clerk invitation succeeds
- **THEN** the invite API returns a visible failure or partial-failure state that the Manager can act on

### Requirement: Developer invite status tracks onboarding
The system SHALL track Developer invite/onboarding status and MUST set invited Developers to `pending` until onboarding succeeds.

#### Scenario: Pending Developer shown to Manager
- **WHEN** a Manager invites a Developer who has not completed onboarding
- **THEN** Team management shows that Developer with pending status

#### Scenario: Developer onboarding success updates status
- **WHEN** an invited Developer signs in and completes onboarding for the Team
- **THEN** the system updates that Developer status to onboarded/success and Team management reflects the updated status

### Requirement: Developer onboarding shows API access details
The system SHALL show onboarded Developers the canonical API base URL and assigned API Key access details.

#### Scenario: Developer sees assigned API access
- **WHEN** an invited Developer completes onboarding and an assigned API Key plaintext is available for display
- **THEN** the Developer view shows the API base URL and API Key with copy affordances

#### Scenario: Plaintext API Key unavailable
- **WHEN** a Developer views API access after plaintext is no longer available
- **THEN** the Developer view shows API Key metadata and create/rotate guidance without exposing stored secret material

### Requirement: Manager Team management copy controls
The system SHALL make assigned Developer API Key display copyable from Manager Team management when a copyable value is available.

#### Scenario: Manager copies assigned Developer API Key
- **WHEN** a Manager views Team management for a Developer with an assigned API Key display value
- **THEN** the UI provides a copy control for that displayed API Key value
