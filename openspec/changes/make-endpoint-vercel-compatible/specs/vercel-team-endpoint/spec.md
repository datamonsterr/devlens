## ADDED Requirements

### Requirement: Vercel deployments expose deployed Team endpoint
The system SHALL expose the Team API endpoint on Vercel deployments using the deployed Vercel origin rather than a Cloudflare quick tunnel process.

#### Scenario: Vercel endpoint status uses deployment URL
- **WHEN** the app runs in Vercel with `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `DEVLENS_PUBLIC_API_ENDPOINT` configured
- **THEN** tunnel status reports the normalized deployed endpoint as `publicUrl` and marks quick tunnel process behavior as unsupported

#### Scenario: Vercel endpoint is copyable for API clients
- **WHEN** a signed-in Manager or Developer views `/dashboard/endpoint` on Vercel
- **THEN** the displayed API endpoint uses the deployed origin plus `/v1`

### Requirement: Vercel deployments do not start quick tunnels
The system SHALL NOT attempt to spawn, download, enable, disable, or health-check a Cloudflare quick tunnel process from a Vercel deployment.

#### Scenario: Manager cannot start quick tunnel on Vercel
- **WHEN** a Manager views `/dashboard/endpoint` on Vercel
- **THEN** local Cloudflare quick tunnel enable controls are not presented as available actions

#### Scenario: Enable API refuses quick tunnel on Vercel
- **WHEN** a Manager calls the quick tunnel enable API on Vercel
- **THEN** the API returns an unsupported result with the deployed public endpoint and does not spawn cloudflared

### Requirement: Local deployments preserve quick tunnel behavior
The system SHALL preserve existing Cloudflare quick tunnel controls and status behavior outside Vercel deployments.

#### Scenario: Local Manager can enable quick tunnel
- **WHEN** a Manager views `/dashboard/endpoint` outside Vercel and required security gates pass
- **THEN** the Cloudflare quick tunnel enable flow remains available
