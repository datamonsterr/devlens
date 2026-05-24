## 1. Data Model and Config

- [x] 1.1 Locate existing Team member, invite, onboarding, and API Key schema/state modules.
- [x] 1.2 Add or map invite/onboarding status values for pending and onboarded/success.
- [x] 1.3 Backfill or default existing active invites without status to pending.
- [x] 1.4 Identify canonical public app URL/API base URL config and add validation/fallback if missing.

## 2. Invite and Email Flow

- [x] 2.1 Update Manager Developer invite API to require successful Clerk Organization invitation before local invite completion.
- [x] 2.2 Create or reuse pending Developer Team state idempotently during invite.
- [x] 2.3 Preserve idempotent one initial API Key assignment per Developer and Team.
- [x] 2.4 Send exactly one onboarding email after local pending state and initial API Key assignment exist.
- [x] 2.5 Include Developer sign-in URL and canonical API base URL in onboarding email content.
- [x] 2.6 Return visible actionable failure/partial-failure state when email dispatch fails.

## 3. Onboarding Status Update

- [x] 3.1 Locate Developer sign-in/onboarding success path after Clerk invitation acceptance.
- [x] 3.2 Update pending Developer invite/member status to onboarded/success when onboarding completes.
- [x] 3.3 Ensure repeated onboarding success handling is idempotent.

## 4. Developer API Access UI

- [x] 4.1 Update Developer view to show canonical API base URL with copy affordance.
- [x] 4.2 Show assigned API Key plaintext with copy affordance only when available from creation/assignment flow.
- [x] 4.3 Show API Key metadata plus create/rotate guidance when plaintext is unavailable.

## 5. Manager Team Management UI

- [x] 5.1 Display invited Developer status as pending or onboarded/success in Team management.
- [x] 5.2 Add copy control for displayed assigned Developer API Key value when available.
- [x] 5.3 Ensure Manager view does not expose unavailable/recoverable API Key plaintext.

## 6. Verification

- [x] 6.1 Add or update tests for successful invite email with sign-in URL and API base URL.
- [x] 6.2 Add or update tests for email dispatch failure visibility.
- [x] 6.3 Add or update tests for pending-to-onboarded status transition.
- [x] 6.4 Add or update tests for Developer API URL/API Key copy UI states.
- [x] 6.5 Add or update tests for Manager Team management status and copy UI.
- [x] 6.6 Run project lint, typecheck, and relevant test commands.
