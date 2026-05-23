## ADDED Requirements

### Requirement: Team Model

Each Clerk Organization SHALL map to exactly one Devlens team. A team SHALL be created automatically via Clerk webhook when a new Clerk Organization is provisioned (triggered by manager sign-up). The team SHALL have a name (derived from Clerk Org name), a Clerk Organization ID, an RTK pool amount, and a creation timestamp.

#### Scenario: Team auto-created on manager sign-up
- **WHEN** a manager signs up and their Clerk Organization is created by the backend
- **THEN** Clerk fires an `organization.created` webhook and the system creates a corresponding Devlens team with the manager as its first member

#### Scenario: Manager views own team
- **WHEN** a manager sends GET `/api/team`
- **THEN** the system returns the single team linked to the manager's Clerk Organization

#### Scenario: Manager updates team name
- **WHEN** a manager sends PUT `/api/team` with `{ name: "Platform Team" }`
- **THEN** the system updates the team name and returns HTTP 200

#### Scenario: Developer attempts team operations
- **WHEN** a developer sends any request to `/api/team`
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: Developer Invitation

Managers SHALL invite developers by entering their email address. The system SHALL create a Clerk organization invitation, which sends a sign-up URL to the developer. Upon completing sign-up via Clerk, the developer SHALL be added to the manager's Clerk Organization and a local user record SHALL be created with role "developer."

#### Scenario: Manager invites developer by email
- **WHEN** a manager sends POST `/api/team/members` with `{ email: "dev@example.com" }`
- **THEN** the system creates a Clerk organization invitation, Clerk sends a sign-up URL to the email, and returns HTTP 202

#### Scenario: Developer completes sign-up from invitation
- **WHEN** a developer clicks the sign-up URL from the invitation email and completes Clerk registration
- **THEN** Clerk adds them to the organization, fires `organizationMembership.created` webhook, and the system creates a local user record with role "developer" linked to the team

#### Scenario: Manager invites developer who is already in another team
- **WHEN** a manager invites a Clerk user who already belongs to a different team
- **THEN** the system returns HTTP 409 Conflict with message "User already belongs to another team"

#### Scenario: Manager removes developer from team
- **WHEN** a manager sends DELETE `/api/team/members/:userId`
- **THEN** the system removes the user's team association, revokes all their API keys, marks the user as inactive in the team, and returns HTTP 204. Historical usage data SHALL remain attributed to the removed developer.

### Requirement: Team Member Listing

Managers SHALL be able to view all developers in their team with their roles, API key counts, and last active timestamps. Developers SHALL NOT be able to view other team members.

#### Scenario: Manager lists team members
- **WHEN** a manager sends GET `/api/team/members`
- **THEN** the system returns an array of team members with name, email, role, api_key_count, and last_active_at

#### Scenario: Developer attempts to list team members
- **WHEN** a developer sends GET `/api/team/members`
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: RTK Pool Management

Managers SHALL be able to allocate and view the RTK token pool for their team. The pool SHALL be an integer representing available tokens. By default, allocations SHALL add to the existing pool (top-up). A `mode: "reset"` parameter SHALL overwrite the pool to the exact amount.

#### Scenario: Manager tops up RTK pool (additive default)
- **WHEN** a manager sends PUT `/api/team/rtk-pool` with `{ amount: 100000 }` and the current pool is 50000
- **THEN** the system adds 100000 to the pool, resulting in 150000, and returns HTTP 200

#### Scenario: Manager resets RTK pool
- **WHEN** a manager sends PUT `/api/team/rtk-pool` with `{ amount: 200000, mode: "reset" }`
- **THEN** the system sets the pool to exactly 200000 regardless of previous remaining value

#### Scenario: Manager views RTK pool status
- **WHEN** a manager sends GET `/api/team/rtk-pool`
- **THEN** the system returns `{ total_ever_allocated: 500000, remaining: 234500, consumed: 265500 }`

### Requirement: Team Settings

Each team SHALL have configurable settings including default model, rate limits, and API key quota per developer. Managers SHALL be able to update these settings.

#### Scenario: Manager sets developer API key quota
- **WHEN** a manager sends PUT `/api/team/settings` with `{ maxKeysPerDeveloper: 5 }`
- **THEN** the system updates the team setting and returns HTTP 200

#### Scenario: Developer exceeds key quota
- **WHEN** a developer attempts to create a 6th API key and the team quota is 5
- **THEN** the system returns HTTP 400 with message "API key limit reached (max 5)"
