## 1. Data and authorization foundations

- [x] 1.1 Audit team-owned tables and add non-destructive migrations/backfills for missing `teamId`, `userId`, role, invitation, and usage fields required by specs
- [x] 1.2 Update server authorization helpers so dashboard APIs enforce local team context and manager/developer permissions consistently
- [x] 1.3 Fix API key metadata access so managers can access team keys and developers can access only their own key metadata
- [x] 1.4 Keep API key plaintext one-time only and ensure list/detail APIs never return plaintext keys

## 2. Team-scoped router and repositories

- [x] 2.1 Update provider connection repository APIs to require and persist `teamId` for team-owned reads and writes
- [x] 2.2 Update combo and model alias repository APIs to require and persist `teamId` for team-owned reads and writes
- [x] 2.3 Propagate authenticated API key context through `/v1/*` handlers into model, combo, provider, pricing, RTK, and usage paths
- [x] 2.4 Ensure `/v1/*` requests reject missing, invalid, inactive, or revoked API keys before provider resolution
- [x] 2.5 Add tests proving cross-team provider connections and combos are not used by another team's developer API key

## 3. Usage attribution and analytics

- [x] 3.1 Update usage persistence to write `teamId`, `userId`, endpoint, provider, model, status, tokens, cost, API key metadata, and RTK savings where available
- [x] 3.2 Add manager overview API and UI data loading for team-wide requests, tokens, costs, models, providers, and recent activity
- [x] 3.3 Add manager per-developer usage API and UI scoped to the manager's team
- [x] 3.4 Add developer personal usage API and UI scoped to the authenticated developer
- [x] 3.5 Add tests proving managers cannot view other teams and developers cannot view team-wide or other-developer usage

## 4. Role-based onboarding and navigation

- [x] 4.1 Add logged-out role selection screen with team manager and team member paths
- [x] 4.2 Wire manager path to sign-up and Clerk Organization/team creation
- [x] 4.3 Wire team member path to existing team sign-in/join flow
- [x] 4.4 Enforce exactly one Clerk Organization per authenticated user before dashboard access
- [x] 4.5 Ensure developers cannot create new team organizations from the app flow
- [x] 4.6 Update dashboard navigation so managers see manager features and developers see developer features

## 5. Team management

- [x] 5.1 Add manager team roster view with developer role, active status, and API key metadata
- [x] 5.2 Add manager invitation flow for developers
- [x] 5.3 Add manager API key oversight actions for revoking developer API keys without exposing plaintext values
- [x] 5.4 Enforce manager-only access for provider connections, combos, pricing overrides, RTK Pool settings, and team settings

## 6. Developer dashboard

- [x] 6.1 Add developer endpoint page showing team tunnel URL and `/v1` base URL
- [x] 6.2 Add developer API key self-service for create, one-time copy, rotate, revoke, and metadata display
- [x] 6.3 Add developer model browser showing manager-configured combos and model information read-only
- [x] 6.4 Update CLI Config Snippets to use team `/v1` base URL and developer API key create/paste flow without requiring stored plaintext
- [x] 6.5 Add developer account settings page scoped to the developer only
- [x] 6.6 Add safe developer console log view with credential masking and no cross-developer secret exposure

## 7. Verification

- [x] 7.1 Add or update route/API tests for role-based onboarding, exactly-one-organization enforcement, manager-only team creation, team management denial for developers, and developer dashboard access
- [x] 7.2 Add or update integration tests for shared endpoint plus distinct developer API key attribution
- [x] 7.3 Add or update UI tests for manager overview, per-developer usage, developer usage, models, endpoint, and CLI Config Snippets
- [x] 7.4 Run project lint, typecheck, and test commands documented in the repository
