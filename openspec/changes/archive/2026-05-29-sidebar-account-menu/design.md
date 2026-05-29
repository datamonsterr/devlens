## Context

Dashboard navigation currently includes account/session actions alongside Devlens capability modules. Stop and standalone Settings placement make sidebar feel like legacy app chrome rather than Team capability navigation.

## Goals / Non-Goals

**Goals:**
- Remove Stop from sidebar and primary dashboard controls.
- Introduce account menu as home for profile, logout, and settings access.
- Remove Settings as standalone sidebar module while preserving settings route access.
- Keep navigation role-safe for Managers and Developers.

**Non-Goals:**
- Change settings page contents or permissions.
- Change authentication provider behavior.
- Add new profile-management features beyond linking/opening existing profile surfaces.
- Remove documented Devlens settings capability.

## Decisions

- Use an account menu for identity/session actions instead of sidebar modules. Rationale: account actions are user-scoped controls, while sidebar modules should remain Team/product capability navigation. Alternative considered: keep Settings in sidebar and only add logout/profile to menu; rejected because it keeps account configuration split across two navigation regions.
- Remove Stop entirely rather than hiding it conditionally. Rationale: Stop is not a Devlens documented dashboard action and should not appear for Manager or Developer roles. Alternative considered: keep Stop behind development flag; rejected because requirement is complete removal from primary controls.
- Preserve settings routes and permission checks while changing entry point. Rationale: behavior stays stable for existing bookmarked/settings URLs, but navigation becomes cleaner. Alternative considered: nest settings under a new route; rejected as unnecessary routing churn.

## Risks / Trade-offs

- Users may look for Settings in sidebar → account menu label and placement must make settings discoverable.
- Existing tests may assert sidebar Settings/Stop presence → update tests to assert absence and account-menu access.
- Account menu may duplicate existing top-right user controls → consolidate into one account menu rather than adding parallel controls.
