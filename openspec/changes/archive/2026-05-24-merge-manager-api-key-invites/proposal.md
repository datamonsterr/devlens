## Why

Manager invitations and API Key provisioning are split across flows, causing broken Developer onboarding: invite API calls can report success while invited accounts never see email or usable setup. Devlens needs one Team management flow where Managers invite Developers, provision exactly one initial API Key, and both sides can see the assigned key metadata.

## What Changes

- Remove standalone Manager-facing create API Key tab.
- Merge Manager API Key provisioning into Team management member invitation/creation.
- When a Manager creates or invites a new Developer, Devlens assigns exactly one initial API Key to that Developer.
- Show the assigned API Key in Manager Team member view and Developer API Key view, respecting plaintext visibility rules.
- Fix Developer invitation so Clerk invitation reaches the invited account instead of only returning local API success.
- Send an onboarding email to invited Developers with Team context and next steps.

## Capabilities

### New Capabilities

### Modified Capabilities
- `team-management`: Manager invitation/member creation must include working Developer invite delivery, onboarding email, and initial API Key assignment.
- `developer-api-keys`: Initial Developer API Key is provisioned from Team management and visible to Manager/Developer according to API Key security rules.
- `clerk-auth`: Developer invitation must create a usable Clerk invitation path for joining the Manager's Team.
- `role-based-access`: Manager API Key creation moves from standalone tab to Team management member flow.

## Impact

- Dashboard navigation and Team management UI.
- Manager member invitation/create APIs.
- Clerk invitation integration and webhook/self-heal handling.
- Email/onboarding delivery service/config.
- API Key creation, storage, display, and metadata APIs.
- Tests for invitation success, onboarding email dispatch, single initial API Key assignment, and role-based access.
