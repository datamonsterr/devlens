## ADDED Requirements

### Requirement: Clerk Authentication Middleware

The system SHALL protect all dashboard routes (`/dashboard/*`) and management API routes (`/api/*` excluding `/api/v1/*`) using Clerk authentication middleware. Unauthenticated requests SHALL be redirected to the Clerk sign-in page.

#### Scenario: Unauthenticated user accesses dashboard
- **WHEN** an unauthenticated user navigates to any `/dashboard` route
- **THEN** the system redirects them to the Clerk sign-in page

#### Scenario: Authenticated user accesses dashboard
- **WHEN** a user with a valid Clerk session navigates to `/dashboard`
- **THEN** the system allows access and renders the dashboard

#### Scenario: Expired session access
- **WHEN** a user with an expired Clerk session accesses a protected route
- **THEN** the system redirects them to re-authenticate via Clerk

### Requirement: Clerk Organization to Team Mapping

The system SHALL map each Clerk Organization to exactly one Devlens team. When a user signs in through an organization, the system SHALL resolve their team context from the Clerk organization ID.

#### Scenario: User signs in with organization membership
- **WHEN** a user signs in via Clerk and belongs to one Clerk Organization
- **THEN** the system associates them with the corresponding Devlens team

#### Scenario: User without organization
- **WHEN** a user signs in via Clerk but belongs to no Clerk Organization
- **THEN** the system denies access and displays "No organization found. Contact your manager."

### Requirement: Clerk Webhook Role Sync

The system SHALL sync user roles from Clerk metadata to the local database via Clerk webhooks. When a user's `publicMetadata.role` changes in Clerk, the local user record SHALL be updated within the webhook handler.

#### Scenario: Role updated via Clerk dashboard
- **WHEN** a manager changes a user's role in the Clerk dashboard
- **THEN** Clerk fires a `user.updated` webhook and the system updates the local user record's role

#### Scenario: New user creation via Clerk
- **WHEN** a new user is created in Clerk with `publicMetadata.role` set
- **THEN** the `user.created` webhook creates a corresponding local user record with that role

### Requirement: Sign-Up with Team Creation

The system SHALL render a sign-up form that includes organization/team name configuration. Any user who completes sign-up SHALL become a manager of a newly created Clerk Organization and Devlens team. There SHALL be no role picker — all self-sign-up users become managers. Developers join exclusively via manager invitation.

#### Scenario: User completes sign-up with team configuration
- **WHEN** a user fills in the sign-up form with name, email, password, and team/org name
- **THEN** the system creates a Clerk user, creates a Clerk Organization with the provided name, sets the user as org admin with role "manager", and the webhook creates the corresponding Devlens team

### Requirement: Sign-In UI

The system SHALL render the standard Clerk `<SignIn>` component for sign-in. No custom sign-in forms SHALL be built.

#### Scenario: User navigates to sign-in page
- **WHEN** a user visits `/sign-in`
- **THEN** the Clerk `<SignIn>` component renders with email, SSO, and social login options

### Requirement: Session Management

The system SHALL use Clerk's built-in session management. Session tokens SHALL be handled by Clerk's middleware with automatic refresh. No custom JWT or session logic SHALL exist in the application.

#### Scenario: Session refresh
- **WHEN** a user's Clerk session token is nearing expiry while they are actively using the dashboard
- **THEN** Clerk automatically refreshes the session without user intervention

### Requirement: API Key Authentication for V1 Routes

The system SHALL authenticate requests to `/v1/*` compatibility endpoints using developer API keys sent as `Authorization: Bearer <key>`. Clerk sessions SHALL NOT gate these routes.

#### Scenario: Developer makes API call with valid key
- **WHEN** a developer sends a request to `/v1/chat/completions` with a valid API key in the Authorization header
- **THEN** the system resolves the developer's identity and team context from the key

#### Scenario: API call with invalid key
- **WHEN** a request to `/v1/*` includes an invalid or revoked API key
- **THEN** the system returns HTTP 401 Unauthorized

### Requirement: Logout

The system SHALL use Clerk's `<UserButton>` component for logout. Clicking sign out SHALL clear the Clerk session and redirect to the sign-in page.

#### Scenario: User clicks sign out
- **WHEN** a user clicks the sign out button in the `<UserButton>` component
- **THEN** the Clerk session is cleared and the user is redirected to `/sign-in`

### Requirement: Manager Onboarding — Automatic Org Creation

The system SHALL automatically create a Clerk Organization during manager sign-up using the Clerk Backend API. The newly created organization SHALL be linked to a Devlens team via the `organization.created` webhook.

#### Scenario: Manager signs up and organization is auto-created
- **WHEN** a new user signs up as a manager
- **THEN** the system calls Clerk Backend API to create an organization, sets the user as org admin with role "manager" in publicMetadata, and the webhook creates the corresponding Devlens team
