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
- Removed Developers keep historical attribution.

## 9router change

Replace single-user local state with Team-scoped state.
