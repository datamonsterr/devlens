## ADDED Requirements

### Requirement: Invitation email contains sign-in and API URL
Developer invitation onboarding email SHALL include a usable sign-in URL and canonical API base URL for the invited Team.

#### Scenario: Invitation email content
- **WHEN** a Manager invitation creates a usable Clerk Organization invitation scoped to the Team
- **THEN** the onboarding email includes a sign-in URL for the Developer and the API base URL used for `/v1/*` requests

### Requirement: Onboarding success updates local status
Developer onboarding after Clerk invitation acceptance SHALL update Devlens local Developer invite state to onboarded/success.

#### Scenario: Clerk sign-in completes onboarding
- **WHEN** an invited Developer signs in with Clerk and joins the invited Team
- **THEN** Devlens updates the local pending invite/member status to onboarded/success
