## Why

Developer invites currently do not reliably send onboarding email, and invite acceptance/onboarding status is unclear to Managers. Developers also need immediate sign-in guidance plus API URL/API Key access after onboarding, while Managers need assigned API Keys to be copyable from Team management.

## What Changes

- Send invite onboarding email after successful Developer invitation, including sign-in URL and API URL.
- Track pending Developer invite/onboarding status and update it when Developer onboarding succeeds.
- Show Developer view with base API URL and assigned API Key after onboarding.
- Make Manager Team management API Key display copyable for assigned Developer keys.
- Ensure invite flow fails visibly when Clerk invite or email dispatch fails.

## Capabilities

### New Capabilities

- `developer-invite-onboarding`: Covers Developer invitation email delivery, pending/onboarded status tracking, Developer onboarding success update, Developer API access display, and copyable Manager Team management API Key UI.

### Modified Capabilities

- `clerk-auth`: Developer invitation/onboarding behavior adds status update and sign-in email requirements.
- `team-management`: Developer invite pending status, onboarding success transition, and copyable assigned API Key behavior change Team management requirements.
- `developer-api-keys`: Developer and Manager views must expose assigned API Key value/metadata in copyable UI according to plaintext availability rules.

## Impact

- Affected auth/invite APIs using Clerk Organization invitations.
- Affected email delivery/onboarding email templates or webhook path.
- Affected Team management Developer invite/member status UI.
- Affected Developer dashboard onboarding/API access page.
- Affected API Key presentation/copy controls and plaintext persistence constraints.
