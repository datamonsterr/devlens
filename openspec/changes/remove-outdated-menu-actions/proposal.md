## Why

DevLens still exposes legacy/local app controls and 9router-era menu actions that do not match the B2B Team dashboard direction. Removing outdated actions reduces user confusion and keeps navigation aligned with documented Devlens capabilities.

## What Changes

- Remove Donate action from the application UI.
- Remove Remote menu item from the top-right menu when it represents legacy remote/cloud sync/Tailscale/proxy behavior.
- Remove Changelog action from the application UI.
- Remove Shutdown action from the application UI.
- Remove unnecessary or outdated settings tied to legacy auth, CLI auto-config writers, cloud/device sync, Tailscale, Proxy Pools, or non-Team-scoped 9router behavior.
- Preserve required Devlens surfaces, including Team endpoint/Cloudflared endpoint if currently represented separately from the legacy Remote action.

## Capabilities

### New Capabilities
- `dashboard-navigation-cleanup`: Defines allowed dashboard/menu actions and removal of legacy or unsupported controls.

### Modified Capabilities

## Impact

- Dashboard/top-right menu components.
- Settings UI and related settings route visibility.
- No API or dependency changes expected unless obsolete settings routes become unreachable or are deleted during implementation.
