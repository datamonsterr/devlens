## Context

Manager onboarding currently spans Team management, Clerk Organization invitations, onboarding email delivery, and API Key management. The target Devlens model uses Team, Manager, Developer, and API Key domain terms: Managers invite Developers through Team management; Developers use per-Developer API Keys for `/v1/*`; Managers inspect key metadata but do not use `/v1/*`.

Current behavior can return invite API success without a visible invited-account email or complete join path. The change also removes the Manager-facing create API Key tab and makes initial Developer API Key assignment part of member creation.

## Goals / Non-Goals

**Goals:**
- Make Manager invite/create Developer flow deliver a real Clerk invitation and onboarding email.
- Assign exactly one initial API Key when a Manager creates or invites a new Developer.
- Show the assigned API Key in Team management for Managers and in Developer API Keys for Developers, without exposing reusable plaintext after creation.
- Remove Manager standalone create API Key UI and route users to Team management.
- Preserve Developer self-service key rotation/revocation where allowed by existing requirements.

**Non-Goals:**
- Allow Managers to use `/v1/*` with API Keys.
- Add multiple initial API Keys per Developer.
- Replace Clerk as auth provider.
- Change Provider Connection, Combo, Pricing Override, RTK Pool, or usage attribution behavior except where onboarding touches Team/Developer identity.

## Decisions

1. Team management owns Manager-created Developer onboarding.
   - Chosen: Manager creates/invites Developer from Team management, triggering Clerk invitation, onboarding email, and initial API Key provisioning in one transaction-like workflow.
   - Alternative: Keep invite and API Key creation separate. Rejected because it preserves broken onboarding and split responsibilities.

2. Initial API Key is created once per Manager-created Developer.
   - Chosen: On invite/create, backend checks for an existing initial key for the Team/Developer and creates one only if absent, enforcing idempotency.
   - Alternative: Create a new key on every invite retry. Rejected because retries would produce multiple keys and confuse attribution.

3. Plaintext visibility remains one-time.
   - Chosen: Display plaintext only at initial creation time if generated server-side in response; later Manager and Developer views show safe metadata and masked prefix/suffix, plus rotation actions where allowed.
   - Alternative: Store encrypted plaintext for later display. Rejected because living spec requires HMAC hash and no reusable plaintext.

4. Clerk invitation success and onboarding email are separate observable outcomes.
   - Chosen: The API returns per-step status/errors for Clerk invite and onboarding email, and treats missing Clerk delivery as failure instead of silent success.
   - Alternative: Fire-and-forget email after returning success. Rejected because current bug is silent success without visible invite.

5. Standalone Manager create API Key tab is removed, not hidden behind role checks only.
   - Chosen: Navigation and route access redirect Managers to Team management for Developer key assignment; Developer API Key page remains for own keys.
   - Alternative: Keep tab disabled for Managers. Rejected because it keeps duplicate mental model.

## Risks / Trade-offs

- Clerk invitation API semantics differ by environment → Add integration tests/mocks around expected request payload and handle provider errors explicitly.
- Email provider missing config in local/dev → Gate send behind configured provider with clear error/status; document env needs in implementation notes.
- Invite retry could create duplicate API Keys → Use idempotent key creation keyed by Team, Developer, and initial-key marker/name.
- Plaintext key shown to Manager could violate security expectations → Limit one-time display; store only HMAC; show metadata afterward.
- Developer account may not exist until invite accepted → Represent pending Developer/member row with email and link API Key once Clerk user resolves, or delay key activation until acceptance while preserving exactly one assigned key record.

## Migration Plan

1. Update Team management backend flow to create pending Developer/member, send Clerk invitation, send onboarding email, and assign one initial API Key idempotently.
2. Remove Manager create API Key tab and route access; update Team management UI to show assigned key metadata/status.
3. Update Developer API Key page to show assigned initial key after join.
4. Add tests for invite delivery failure, email dispatch, idempotent retry, Manager/Developer visibility, and removed tab.
5. Rollback by restoring old navigation and disabling integrated key assignment behind a feature flag or code revert; existing HMAC API Key rows remain valid.

## Open Questions

- Which email provider/service is canonical for onboarding email in this repo, if any currently exists?
- Should initial API Key become active immediately at invite time or only after Developer accepts Clerk invitation?
