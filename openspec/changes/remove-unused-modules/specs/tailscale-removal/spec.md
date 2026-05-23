## ADDED Requirements

### Requirement: Tailscale source files deleted

The system SHALL have no tailscale integration source code. The file `src/lib/tunnel/tailscale.js` SHALL be deleted. All 6 tailscale-specific API routes under `src/app/api/tunnel/tailscale-*` SHALL be deleted.

#### Scenario: Tailscale library file removed
- **WHEN** a developer searches for `src/lib/tunnel/tailscale.js`
- **THEN** the file does not exist

#### Scenario: Tailscale API routes removed
- **WHEN** a request is made to any `/api/tunnel/tailscale-*` endpoint
- **THEN** the system returns HTTP 404

### Requirement: Tailscale stripped from tunnel manager

The tunnel manager SHALL only manage the cloudflared tunnel provider. All tailscale methods (`enableTailscale`, `disableTailscale`, `getTailscaleStatus`) SHALL be removed from `src/lib/tunnel/tunnelManager.js`.

#### Scenario: Tunnel manager has no tailscale methods
- **WHEN** `tunnelManager.js` is inspected
- **THEN** no tailscale-related exports or methods exist

### Requirement: Tailscale state tracking removed

The tunnel state module (`src/lib/tunnel/state.js`) SHALL only track cloudflared state. The `TAILSCALE_PID_FILE` constant SHALL be removed.

#### Scenario: State module has no tailscale tracking
- **WHEN** `state.js` is inspected
- **THEN** no tailscale PID file or URL references exist

### Requirement: Tailscale settings defaults removed

The settings defaults in `src/lib/db/repos/settingsRepo.js` SHALL NOT include `tailscaleEnabled` or `tailscaleUrl` fields.

#### Scenario: New settings object has no tailscale fields
- **WHEN** default settings are created for a new team
- **THEN** the settings object contains no `tailscaleEnabled` or `tailscaleUrl` keys

### Requirement: Tailscale auto-resume removed from app init

The app initialization module (`src/shared/services/initializeApp.js`) SHALL NOT auto-resume tailscale. All tailscale-related calls SHALL be removed.

#### Scenario: App init does not start tailscale
- **WHEN** the application starts or restarts
- **THEN** no tailscale daemon or funnel is started

### Requirement: Tailscale removed from endpoint dashboard UI

The endpoint dashboard page (`EndpointPageClient.js`) SHALL only show cloudflared tunnel controls. All tailscale install, login, enable, disable, health ping, and security warning UI SHALL be removed.

#### Scenario: Endpoint page shows only cloudflared controls
- **WHEN** a manager visits the endpoint dashboard
- **THEN** only cloudflared tunnel enable/disable and status are visible

### Requirement: Tailscale removed from CLI tool cards

All 13 CLI tool card components SHALL NOT receive `tailscaleEnabled` or `tailscaleUrl` props. `BaseUrlSelect` SHALL NOT include tailscale URL as a dropdown option. `ToolDetailClient` SHALL NOT pass tailscale state to child cards. `cliEndpointMatch` SHALL NOT match tailscale URLs.

#### Scenario: CLI tool card has no tailscale props
- **WHEN** a developer views any CLI tool detail page
- **THEN** the base URL dropdown does not include a tailscale option

### Requirement: Tailscale removed from tunnel status route

The tunnel status API route (`src/app/api/tunnel/status/route.js`) SHALL only report cloudflared tunnel status. Tailscale status fields SHALL be removed from the response.

#### Scenario: Tunnel status returns only cloudflared data
- **WHEN** GET `/api/tunnel/status` is called
- **THEN** the response includes cloudflared tunnel status but no tailscale fields

### Requirement: Tailscale removed from settings require-login route

The settings require-login route (`src/app/api/settings/require-login/route.js`) SHALL NOT include `tailscaleUrl` in its response.

#### Scenario: Require-login settings have no tailscale URL
- **WHEN** GET `/api/settings/require-login` is called
- **THEN** the response contains no `tailscaleUrl` field

### Requirement: Cloudflared tunnel functionality preserved

The cloudflared tunnel SHALL continue to function identically. `tunnelManager.js` SHALL still expose `enableTunnel`, `disableTunnel`, `getTunnelStatus` for cloudflared. All cloudflared API routes and UI controls SHALL work unchanged.

#### Scenario: Cloudflared tunnel enable works
- **WHEN** a manager enables the tunnel from the endpoint dashboard
- **THEN** cloudflared starts and produces a quick-tunnel URL visible in the UI
