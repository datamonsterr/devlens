## Context

Devlens uses enabled Clerk Organizations as teams, with manager and developer roles stored in team membership data and surfaced in dashboard UI. Each user belongs to exactly one Clerk Organization/team. Dashboard APIs use Clerk team context, while `/v1/*` APIs authenticate with Devlens API keys and pass team/developer context into the router.

Current schema already includes team and user fields for provider connections, combos, API keys, usage history, RTK Pool history, pricing overrides, and team settings. Several runtime paths still need tighter team scoping and attribution: provider connections and combos must resolve within the API key's team, usage writes must persist team/developer identity, and CLI config must respect one-time API key display.

## Goals / Non-Goals

**Goals:**
- Define role-based entry, onboarding, dashboard navigation, and API authorization around team managers and developers.
- Ensure each developer uses distinct API keys against the same team tunnel endpoint.
- Make `/v1/*` routing team-scoped from API key authentication through combo/model/provider selection, RTK Pool accounting, and usage logging.
- Give developers self-service views for endpoint, API key, models, personal usage, CLI Config Snippets, account settings, and console logs.
- Give managers team management, provider/combo/pricing/settings controls, overview analytics, and per-developer usage.

**Non-Goals:**
- Building separate tunnel endpoints per developer.
- Allowing developers to modify provider connections, combos, pricing overrides, RTK Pool settings, or team settings.
- Persisting plaintext API keys after creation.
- Replacing Clerk as the organization and session identity provider.
- Supporting multi-organization membership for one user.
- Reworking provider SDKs or combo fallback semantics beyond team scoping.

## Decisions

### Role and team authority
Use Clerk Organization membership as the sign-up/join source, enforce one organization per user, then enforce dashboard/API permissions through server-side team context from the local database.

Alternatives considered:
- Clerk metadata only: simpler UI checks, but can drift from local team membership and does not support inactive users well.
- Local database only: stronger app control, but loses Clerk organization lifecycle integration.

Rationale: Clerk remains the organization lifecycle source, while local team context is the authorization source for Devlens resources.

### Manager-only team creation
The logged-out entry screen separates `team manager` and `team member`. Managers can create a team organization. Developers must join an existing team through invitation or membership flow. If a user already belongs to a Clerk Organization, Devlens uses that organization as the user's only team and does not offer another team creation/join path.

Alternatives considered:
- Let any user create a team and later choose a role: easier onboarding, but violates B2B manager provisioning model.
- Hide role choice behind Clerk only: less product clarity and harder to explain why developers cannot create teams.

Rationale: Devlens teams own provider connections, combos, pricing, RTK Pool, and usage, so organization creation must be manager-controlled.

### Shared tunnel, distinct API keys
Expose one team tunnel endpoint to all developers and distinguish developers by API key. API key authentication returns `teamId`, `userId`, and role for request routing and attribution.

Alternatives considered:
- Per-developer tunnel endpoints: stronger visual separation, but adds operational complexity without changing provider routing.
- Shared API key per team: simpler, but prevents per-developer usage, revocation, and accountability.

Rationale: Team resources are shared, but access and usage must be attributable per developer.

### Team-scoped router resolution
All `/v1/*` requests authenticate before routing. The router uses the authenticated team to resolve provider connections, combos, model aliases, pricing overrides, RTK Pool, and usage records. Developers can consume configured combos/models but cannot change them.

Alternatives considered:
- Resolve provider connections globally: current simpler path, but leaks cross-team configuration.
- Pass role only to UI and keep router unchanged: leaves core API behavior unscoped.

Rationale: API key identity must determine both authorization and data boundary.

### API key plaintext handling
Show API key plaintext only at creation. Developer endpoint and CLI Config Snippets must support copy/paste of newly created keys and display key metadata afterward, without returning plaintext from list APIs.

Alternatives considered:
- Store encrypted plaintext for future CLI snippets: more convenient, but increases credential exposure.
- Keep hashed-only keys and require manual paste when needed: safer and aligned with current key model.

Rationale: One-time display limits secret exposure while preserving self-service setup.

### Usage and console visibility
Usage events persist both `teamId` and `userId`. Managers can view team overview and per-developer usage. Developers can view only their own usage. Console logs shown to developers are limited to safe runtime logs available to the team dashboard and must not expose provider credentials or other developers' API keys.

Alternatives considered:
- Usage aggregated only at team level: easier, but misses per-developer accountability.
- Give developers team-wide logs: useful for debugging, but risks leaking other developers' activity.

Rationale: Managers need operational visibility; developers need self-service debugging and personal cost awareness.

## Risks / Trade-offs

- Role source drift between Clerk metadata and local team membership → use server-side team context for authorization and treat client role checks as presentation only.
- Existing provider connection and combo repos are not fully team-scoped → update repository APIs and call sites to require `teamId` on team-owned reads/writes.
- Usage dashboard may remain empty if writer omits `teamId`/`userId` → propagate API key auth context to usage persistence and add regression tests.
- CLI snippets cannot recover existing plaintext API keys → require create/copy flow and support manual key paste in snippets.
- Console logs can leak sensitive data → mask API keys/provider credentials and avoid exposing cross-team or raw secret-bearing logs.
- Manager-only onboarding can block solo evaluation → manager path remains default for creating a new team.
- Clerk allows unexpected multi-organization membership if configuration changes → validate active organization count in onboarding/webhook handling and fail closed until resolved.

## Migration Plan

1. Add or backfill missing team/developer fields for provider connections, combos, usage, and settings where existing data lacks ownership.
2. Update repository methods to require explicit `teamId` for team-owned resources.
3. Update `/v1/*` request context propagation before enabling role-specific dashboard restrictions.
4. Add role-aware dashboard navigation and pages.
5. Verify manager and developer flows with seeded teams and API keys.
6. Rollback by hiding new navigation and retaining existing team data; database additions are non-destructive.

## Open Questions

- Should developers see only their own console log entries, or a filtered team console log with secrets masked?
- Should managers be able to create API keys on behalf of developers, or only revoke/inspect metadata?
- Should team member join happen only via Clerk invitations, or also via invite code/link inside Devlens?
