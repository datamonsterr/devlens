## Why

Devlens currently lacks clear role-based onboarding and team/member surfaces, which blocks managers from provisioning AI access across developer teams while giving developers only the credentials and usage information they need. This change introduces team manager and developer experiences around team management, API keys, model access, CLI configuration, usage, and console logs.

## What Changes

- Add a logged-out entry screen with two role paths: team manager and team member.
- Use Clerk Organizations as the required team boundary and enforce that each user belongs to exactly one organization.
- Allow only team managers to create a new team organization during sign-up.
- Add team management for team managers, including developer invitations, roster management, API key oversight, and per-developer usage visibility.
- Add developer dashboard sections for endpoint, API key display, account settings, models, usage, CLI Config Snippets, and console logs.
- Keep developers on the shared team tunnel endpoint while assigning each developer a distinct API key.
- Route `/v1/*` API requests by developer API key to the team-scoped provider connections, combos, pricing, RTK Pool, and usage accounting.
- Add manager overview dashboard for team-wide activity and developer-level usage.

## Capabilities

### New Capabilities
- `role-based-onboarding`: Logged-out role selection, Clerk Organization requirement, single-organization membership, manager-only team creation, and team member join flow.
- `team-management`: Manager controls for developers, invitations, account settings, and developer API key oversight.
- `developer-dashboard`: Developer-only dashboard for endpoint, API key, models, personal usage, CLI Config Snippets, and console logs.
- `team-routed-api-access`: API routing model where distinct developer API keys use the same team tunnel endpoint and resolve through team provider connections, combos, pricing, RTK Pool, and usage accounting.
- `usage-analytics`: Manager overview and per-developer usage views plus developer personal usage views.

### Modified Capabilities

## Impact

- Dashboard routing, navigation, and access control for manager and developer roles.
- Clerk organization sign-up/join flows and role metadata.
- Backend API key lookup, authorization, and request attribution for `/v1/*` endpoints.
- Router request pipeline for team tunnel resolution, combo/model selection, provider connection selection, RTK accounting, and usage logging.
- Database schema for developers, invitations, API keys, usage events, console logs, and team-scoped settings if missing or incomplete.
- UI sections for team management, developer dashboard, manager overview dashboard, and CLI Config Snippets.
