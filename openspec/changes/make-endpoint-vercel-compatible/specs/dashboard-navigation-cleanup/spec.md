## MODIFIED Requirements

### Requirement: Legacy Remote action removed
The system SHALL NOT show a Remote menu item when that item represents legacy cloud sync, device sync, Tailscale, proxy remote, local Cloudflare quick tunnel controls on Vercel, or other unsupported remote behavior.

#### Scenario: Legacy Remote menu item excluded
- **WHEN** a signed-in Manager or Developer opens the top-right menu
- **THEN** legacy Remote actions for cloud sync, device sync, Tailscale, proxy remote behavior, or unsupported Vercel quick tunnel behavior are not present

#### Scenario: Team endpoint remains available
- **WHEN** the product exposes documented Team endpoint, Vercel deployed endpoint, or local Cloudflared endpoint functionality
- **THEN** the endpoint remains available through the documented `/dashboard/endpoint` surface, not through an ambiguous legacy Remote menu item
