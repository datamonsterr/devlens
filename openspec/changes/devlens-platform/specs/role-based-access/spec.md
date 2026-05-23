## ADDED Requirements

### Requirement: Role-Based Middleware

The system SHALL enforce role-based access at the API route level. Each protected route SHALL check the requesting user's role before executing business logic. Manager routes SHALL reject Developer requests with HTTP 403 Forbidden.

#### Scenario: Manager accesses manager-only route
- **WHEN** a user with role "manager" sends a request to a manager-only API route
- **THEN** the system allows the request and executes the handler

#### Scenario: Developer attempts manager-only route
- **WHEN** a user with role "developer" sends a request to a manager-only API route
- **THEN** the system returns HTTP 403 Forbidden with message "Insufficient permissions"

#### Scenario: Unauthenticated user attempts protected route
- **WHEN** an unauthenticated user sends a request to any protected API route
- **THEN** the system returns HTTP 401 Unauthorized

### Requirement: Manager Permissions

A user with the Manager role SHALL be able to:
- Create, read, update, and delete provider connections
- Create, read, update, and delete provider nodes
- Create, read, update, and delete model combos
- Create, read, update, and delete model aliases
- View and update pricing configurations (auto-fetched from provider APIs by default, manager can override with custom prices)
- View and update own team settings
- Invite and remove developers from own team
- Set team RTK pool amounts
- View aggregate team usage and cost analytics
- View per-developer usage breakdowns
- Revoke any API key in their team
- View and update system settings

A Manager SHALL NOT be able to:
- Create or use their own API keys for `/v1/*` access (dashboard-only role)
- Access `/v1/*` compatibility endpoints (API restricted to developer API keys only)

#### Scenario: Manager creates a new combo
- **WHEN** a manager sends a POST request to `/api/combos` with valid combo data
- **THEN** the system creates the combo scoped to their team and returns HTTP 201

#### Scenario: Manager views usage dashboard
- **WHEN** a manager navigates to the usage dashboard page
- **THEN** the system displays aggregate usage for their team with per-developer breakdown

### Requirement: Developer Permissions

A user with the Developer role SHALL be able to:
- Create, view, and revoke their own API keys
- View available models, combos, providers, and pricing (read-only)
- View their personal usage statistics
- View and copy configuration snippets for local CLI tools (API base URL and key)

A Developer SHALL NOT be able to:
- Modify provider connections, nodes, combos, or aliases
- View other developers' usage
- Access team management functions
- Modify RTK pool settings
- View or modify system settings

#### Scenario: Developer views model browser
- **WHEN** a developer navigates to the model browser page
- **THEN** the system displays all models, combos, and providers in read-only mode

#### Scenario: Developer attempts to create a combo
- **WHEN** a developer sends a POST request to `/api/combos`
- **THEN** the system returns HTTP 403 Forbidden

#### Scenario: Developer views personal usage
- **WHEN** a developer navigates to their usage page
- **THEN** the system displays only that developer's usage statistics

### Requirement: Route-Level Authorization Decorator

The system SHALL provide a reusable authorization utility that accepts a required role and returns a middleware-like check. This utility SHALL be used consistently across all protected API routes.

#### Scenario: Protecting a manager-only route
- **WHEN** a route handler calls `requireRole("manager")` at the top of the handler
- **THEN** it returns a 403 response if the current user is not a manager

#### Scenario: Protecting a route accessible to both roles
- **WHEN** a route handler calls `requireRole(["manager", "developer"])`
- **THEN** it allows access if the user has either role

### Requirement: UI Element Visibility

The system SHALL conditionally render UI elements based on the user's role. Manager-only navigation items and action buttons SHALL NOT appear for developers.

#### Scenario: Developer views sidebar navigation
- **WHEN** a developer loads any dashboard page
- **THEN** the sidebar SHALL NOT show links to Team Management, Provider Management, or System Settings

#### Scenario: Manager views sidebar navigation
- **WHEN** a manager loads any dashboard page
- **THEN** the sidebar SHALL show all navigation links including Team Management, Provider Management, and System Settings

### Requirement: Team Context Resolution

Every API route (except auth routes) SHALL resolve the requesting user's team context from the database. All data queries SHALL be scoped by `team_id`.

#### Scenario: Manager fetches combos
- **WHEN** a manager calls GET `/api/combos`
- **THEN** the system returns only combos belonging to the manager's team

#### Scenario: Cross-team data isolation
- **WHEN** a user from Team A attempts to access resources belonging to Team B
- **THEN** the system returns either empty results or HTTP 404 (resource not found in their scope)
