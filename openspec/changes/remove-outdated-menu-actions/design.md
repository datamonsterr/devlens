## Context

Devlens is a Team-scoped B2B dashboard, but some UI surfaces still reflect local/9router-era behavior. The cleanup spans top-right menu actions and settings surfaces, with care to preserve required Devlens dashboard routes such as CLI Config Snippets and Team endpoint.

## Goals / Non-Goals

**Goals:**
- Remove Donate, Changelog, Shutdown, and legacy Remote menu actions.
- Remove outdated settings tied to legacy auth, CLI auto-config writers, cloud/device sync, Tailscale, Proxy Pools, or non-Team-scoped behavior.
- Keep navigation consistent with documented Devlens dashboard capabilities.
- Preserve Cloudflared Team endpoint access if it is distinct from legacy Remote behavior.

**Non-Goals:**
- Redesign dashboard navigation.
- Change Clerk authentication or API Key authentication flows.
- Remove documented Devlens routes such as `/dashboard/cli-config`, `/dashboard/endpoint`, or `/dashboard/console-log`; `/dashboard/cli-config` may redirect to existing `/dashboard/cli-tools` until route names are fully migrated.
- Change database schema unless implementation discovers settings backed only by removable UI code.

## Decisions

- Treat top-right menu cleanup as removal, not feature-flagging. Rationale: these controls are unsupported product behavior, so hiding behind flags keeps confusion and test surface.
- Distinguish legacy Remote from Team endpoint. Rationale: cloud/device sync, Tailscale, or proxy remote controls are obsolete, while Cloudflared Team endpoint remains documented.
- Prefer removing obsolete settings entries from render/config sources before deleting lower-level modules. Rationale: visible behavior changes first, then dead code cleanup can be scoped safely during implementation.
- Preserve role-aware access. Rationale: Managers and Developers retain documented capabilities; cleanup must not broaden settings access.

## Risks / Trade-offs

- Remote label ambiguity → inspect current route/component before removal; preserve `/dashboard/endpoint` if Remote maps to Team endpoint.
- Outdated settings may share components with valid settings → remove only obsolete fields/sections, not shared layout.
- Dead backend code may remain after UI cleanup → document follow-up if deletion requires broader schema or API migration.
