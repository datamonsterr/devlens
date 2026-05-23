## ADDED Requirements

### Requirement: Logged-out role selection
The system SHALL show unauthenticated visitors an entry screen with role choices for team manager and team member.

#### Scenario: Visitor chooses manager path
- **WHEN** an unauthenticated visitor selects the team manager path
- **THEN** the system SHALL start a sign-up flow that can create a new team organization

#### Scenario: Visitor chooses team member path
- **WHEN** an unauthenticated visitor selects the team member path
- **THEN** the system SHALL start a sign-in or join flow for an existing team organization

### Requirement: Clerk Organization team boundary
The system SHALL require every authenticated user to belong to exactly one Clerk Organization mapped to one Devlens team.

#### Scenario: User has one organization
- **WHEN** an authenticated user belongs to one Clerk Organization
- **THEN** the system SHALL use that organization as the user's Devlens team

#### Scenario: User has no organization
- **WHEN** an authenticated user belongs to no Clerk Organization
- **THEN** the system SHALL direct the user to the manager team creation flow or team member join flow

#### Scenario: User has more than one organization
- **WHEN** an authenticated user belongs to more than one Clerk Organization
- **THEN** the system SHALL block Devlens access until the user has exactly one organization

### Requirement: Manager-only team organization creation
The system SHALL allow only team managers to create new Clerk Organizations and mapped Devlens teams.

#### Scenario: Manager creates team
- **WHEN** a signed-up manager completes organization creation
- **THEN** the system SHALL create a Devlens team mapped to the Clerk organization

#### Scenario: Developer attempts team creation
- **WHEN** a team member attempts to create a new team organization
- **THEN** the system SHALL deny team creation and direct the developer to join an existing team

### Requirement: Team member onboarding
The system SHALL allow developers to join existing teams without creating new organizations.

#### Scenario: Invited developer joins team
- **WHEN** an invited developer accepts a team invitation
- **THEN** the system SHALL create or activate a developer membership for that team
