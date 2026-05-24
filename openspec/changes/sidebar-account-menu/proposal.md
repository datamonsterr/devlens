## Why

The sidebar still exposes legacy/session controls as primary navigation, which conflicts with Devlens dashboard navigation expectations. Account-specific actions belong in an account menu so Team capability navigation stays focused.

## What Changes

- Remove the Stop button completely from the sidebar and related primary navigation controls.
- Add an account settings menu for signed-in Managers and Developers.
- Move logout, profile access, and settings access into the account menu.
- Remove Settings as a standalone sidebar module while keeping settings reachable through the account menu.

## Capabilities

### New Capabilities

### Modified Capabilities
- `dashboard-navigation-cleanup`: Require Stop removal, account menu placement for logout/profile/settings, and removal of standalone Settings sidebar module.

## Impact

- Dashboard sidebar/navigation components.
- Account/user menu components.
- Settings route entry points and navigation links.
- UI tests or snapshots covering dashboard navigation.
