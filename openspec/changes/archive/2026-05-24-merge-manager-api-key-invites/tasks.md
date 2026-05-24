## 1. Current Flow Discovery

- [x] 1.1 Locate Manager Team management invite/create Developer UI and API paths
- [x] 1.2 Locate current API Key tab/navigation, Manager permissions, and Developer API Keys page
- [x] 1.3 Locate Clerk Organization invitation code, webhook/self-heal paths, and current invite bug source
- [x] 1.4 Locate existing email/onboarding utilities or decide minimal provider integration path

## 2. Backend Invitation and API Key Flow

- [x] 2.1 Update Manager invite/create Developer endpoint to call Clerk invitation scoped to Team and fail when Clerk fails
- [x] 2.2 Create or update pending Developer/Team member persistence for invited email and invite status
- [x] 2.3 Add onboarding email send with Team context and join instructions after invite acceptance by backend
- [x] 2.4 Add idempotent initial API Key assignment for Manager-created Developers with exactly one key per Team/Developer
- [x] 2.5 Ensure API Key storage keeps HMAC only and returns reusable plaintext only in initial creation response
- [x] 2.6 Ensure invite retry reuses existing pending member and initial API Key assignment without duplicates

## 3. Manager UI Changes

- [x] 3.1 Remove standalone Manager-facing create API Key tab from dashboard navigation
- [x] 3.2 Redirect or block obsolete Manager create API Key route to Team management
- [x] 3.3 Add Team management member invite/create UI state for Clerk invite status and onboarding email status
- [x] 3.4 Show assigned Developer API Key metadata in Manager Team member view without stored plaintext
- [x] 3.5 Surface Clerk invite or onboarding email failures instead of success messaging

## 4. Developer UI Changes

- [x] 4.1 Show assigned initial API Key metadata on Developer API Keys page after Team join
- [x] 4.2 Preserve allowed Developer self-service actions for own API Keys
- [x] 4.3 Ensure Developer cannot modify Team settings, Provider Connections, Combos, Pricing Overrides, or RTK Pool

## 5. Tests and Verification

- [x] 5.1 Add tests for Clerk invite failure returning API failure and visible UI error
- [x] 5.2 Add tests for onboarding email send payload with Team context and join instructions
- [x] 5.3 Add tests for exactly one initial API Key on invite/create and retry idempotency
- [x] 5.4 Add tests for Manager metadata visibility and no stored plaintext exposure
- [x] 5.5 Add tests for removed Manager create API Key tab and Team management replacement flow
- [x] 5.6 Run project lint, typecheck, and relevant test commands

## 6. Living Specs Sync

- [x] 6.1 Update docs/living_spec feature specs for Team management, Developer API Keys, Clerk auth, and role-based access after implementation
