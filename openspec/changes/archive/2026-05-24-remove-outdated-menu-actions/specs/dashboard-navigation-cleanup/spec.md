## ADDED Requirements

### Requirement: Legacy application actions hidden
The system SHALL NOT show Donate, Changelog, or Shutdown actions in dashboard navigation, top-right menus, settings pages, or other primary application controls.

#### Scenario: Top-right menu excludes legacy actions
- **WHEN** a signed-in Manager or Developer opens the top-right menu
- **THEN** Donate, Changelog, and Shutdown actions are not present

#### Scenario: Dashboard controls exclude legacy actions
- **WHEN** a signed-in Manager or Developer views dashboard navigation or settings controls
- **THEN** Donate, Changelog, and Shutdown actions are not present

### Requirement: Legacy Remote action removed
The system SHALL NOT show a Remote menu item when that item represents legacy cloud sync, device sync, Tailscale, proxy remote, or other unsupported remote behavior.

#### Scenario: Legacy Remote menu item excluded
- **WHEN** a signed-in Manager or Developer opens the top-right menu
- **THEN** legacy Remote actions for cloud sync, device sync, Tailscale, or proxy remote behavior are not present

#### Scenario: Team endpoint remains available
- **WHEN** the product exposes documented Team endpoint or Cloudflared endpoint functionality
- **THEN** the endpoint remains available through the documented `/dashboard/endpoint` surface, not through an ambiguous legacy Remote menu item

### Requirement: Outdated settings hidden
The system SHALL NOT show settings for legacy password/JWT/auth token auth, CLI auto-config writers/checkers, cloud or device sync, Tailscale, Proxy Pools, or non-Team-scoped 9router behavior.

#### Scenario: Settings exclude obsolete configuration
- **WHEN** a signed-in Manager opens settings or dashboard configuration screens
- **THEN** obsolete legacy auth, CLI auto-config writer/checker, cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped settings are not present

#### Scenario: Devlens settings remain available
- **WHEN** a signed-in Manager or Developer opens a documented Devlens dashboard route
- **THEN** Team-scoped settings, API Keys, Provider Connections, Combos, Pricing Overrides, RTK Pool, Model Browser, Usage, CLI Config Snippets, Console Log, and Team endpoint surfaces remain available according to role permissions
