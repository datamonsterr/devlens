## ADDED Requirements

### Requirement: Developer API access view exposes base URL
Developer API Key views SHALL show the canonical API base URL used for `/v1/*` requests.

#### Scenario: Developer copies API URL
- **WHEN** a Developer opens the API access view
- **THEN** the view shows the canonical API base URL with a copy affordance

### Requirement: Assigned API Key display respects one-time plaintext
Assigned API Key UI SHALL expose plaintext only when available from creation/assignment flow and MUST otherwise show metadata plus create/rotate guidance.

#### Scenario: Plaintext available
- **WHEN** an assigned API Key plaintext value is available during onboarding or creation
- **THEN** the UI shows the value with copy affordance

#### Scenario: Plaintext unavailable
- **WHEN** the assigned API Key plaintext value is not available after initial display
- **THEN** the UI does not expose secret material and instead shows API Key metadata plus create/rotate guidance
