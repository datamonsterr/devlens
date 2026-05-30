# Role-based access

## Type

New Devlens feature.

## Roles

- Manager: dashboard-only Team operator.
- Developer: API consumer and self-service dashboard user.

## Manager can

- Manage Team.
- Invite/remove Developers.
- Assign initial Developer API Keys through Team management.
- Manage Provider Connections.
- Manage Combos.
- Manage Pricing Overrides.
- Manage RTK Pool.
- View Team usage and per-Developer analytics.
- Generate and review Team AI ROI reports.

## Developer can

- Create, rotate, revoke own API Keys within Team quota.
- Browse available models and Combos.
- View own usage.
- Copy CLI Config Snippets.
- Use `/v1/*` with API Key.

## Manager cannot

Use `/v1/*` with API Key or create standalone Manager API Keys outside Team management.

## Developer cannot

Modify Provider Connections, Combos, Pricing Overrides, RTK Pool, or Team settings.
