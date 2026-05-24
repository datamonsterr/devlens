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
- Developer invite creates or reuses pending Team member state with invite status.
- Team management shows invited Developer status as `pending` until onboarding succeeds, then `onboarded`.
- Developer invite sends onboarding email when onboarding email webhook is configured; email includes sign-in URL and canonical API base URL.
- Invite API fails visibly when Clerk invitation creation or onboarding email dispatch fails.
- Manager-created Developer receives exactly one initial API Key assignment through Team management.
- Manager can inspect assigned Developer API Key metadata from Team management.
- Manager can copy displayed assigned API Key values from Team management; stored secret material is not re-exposed after creation.
- Removed Developers keep historical attribution.

## 9router change

Replace single-user local state with Team-scoped state.
