## MODIFIED Requirements

### Requirement: Legacy application actions hidden
The system SHALL NOT show Donate, Changelog, Shutdown, or Stop actions in dashboard navigation, top-right menus, account menus, settings pages, or other primary application controls.

#### Scenario: Top-right menu excludes legacy actions
- **WHEN** a signed-in Manager or Developer opens the top-right menu
- **THEN** Donate, Changelog, Shutdown, and Stop actions are not present

#### Scenario: Dashboard controls exclude legacy actions
- **WHEN** a signed-in Manager or Developer views dashboard navigation or settings controls
- **THEN** Donate, Changelog, Shutdown, and Stop actions are not present

### Requirement: Outdated settings hidden
The system SHALL NOT show settings for legacy password/JWT/auth token auth, CLI auto-config writers/checkers, cloud or device sync, Tailscale, Proxy Pools, or non-Team-scoped 9router behavior. The system SHALL NOT show Settings as a standalone sidebar module, and SHALL keep Devlens settings reachable through the account menu.

#### Scenario: Settings exclude obsolete configuration
- **WHEN** a signed-in Manager opens settings or dashboard configuration screens
- **THEN** obsolete legacy auth, CLI auto-config writer/checker, cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped settings are not present

#### Scenario: Devlens settings remain available
- **WHEN** a signed-in Manager or Developer opens a documented Devlens dashboard route
- **THEN** Team-scoped settings, API Keys, Provider Connections, Combos, Pricing Overrides, RTK Pool, Model Browser, Usage, CLI Config Snippets, Console Log, and Team endpoint surfaces remain available according to role permissions

#### Scenario: Settings live in account menu
- **WHEN** a signed-in Manager or Developer views dashboard navigation
- **THEN** Settings is not shown as a standalone sidebar module
- **AND** Settings is available from the account menu

## ADDED Requirements

### Requirement: Account menu contains account actions
The system SHALL provide an account menu for signed-in Managers and Developers that contains logout, profile access, and settings access.

#### Scenario: Account menu shows account actions
- **WHEN** a signed-in Manager or Developer opens the account menu
- **THEN** logout, profile access, and settings access are present

#### Scenario: Sidebar excludes account actions
- **WHEN** a signed-in Manager or Developer views the sidebar
- **THEN** logout, profile access, Stop, and standalone Settings module are not shown as sidebar modules
