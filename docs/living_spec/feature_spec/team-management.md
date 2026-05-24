# Team management

## Type

New Devlens feature.

## Purpose

Team owns Provider Connections, Combos, Pricing Overrides, RTK Pool, settings, API Keys, and usage.

## Requirements

- One Clerk Organization maps to one Team.
- One Manager per Team for MVP.
- One user belongs to one Team.
- Manager creates Team during sign-up.
- Manager invites Developers by email through Clerk.
- Developer invite success requires Clerk invitation success.
- Developer invite creates pending Team member state with invite status.
- Developer invite sends onboarding email when onboarding email webhook is configured.
- Manager-created Developer receives exactly one initial API Key assignment through Team management.
- Manager can inspect assigned Developer API Key metadata from Team management.
- Removed Developers keep historical attribution.

## 9router change

Replace single-user local state with Team-scoped state.
