## Context

Devlens exposes `/v1/*` APIs from the same deployed app that hosts the dashboard. Local development can optionally expose that app through Cloudflare quick tunnels, but Vercel deployments cannot spawn or supervise `cloudflared` processes. Current backend logic already has a Vercel branch that returns a deployed endpoint from `DEVLENS_PUBLIC_API_ENDPOINT`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`, but the Endpoint page still centers local tunnel enablement, progress, reachability checks, and Cloudflare-specific language.

Managers need the Endpoint page to communicate the correct mode:

```
Runtime
├─ Vercel deployment ──▶ deployed Vercel origin ──▶ /v1/* API endpoint
└─ Local app ──────────▶ optional cloudflared ─────▶ /v1/* API endpoint
```

## Goals / Non-Goals

**Goals:**
- Make Vercel deployments use the deployed Vercel URL as the Team API endpoint.
- Prevent Managers from trying to start Cloudflare quick tunnels on Vercel.
- Keep `/dashboard/endpoint` useful on Vercel by showing copyable `/v1` endpoint and API key guidance.
- Preserve local Cloudflare quick tunnel behavior outside Vercel.
- Keep status semantics explicit enough for UI tests and unit tests.

**Non-Goals:**
- Replace Cloudflare quick tunnels for local development.
- Add a new external relay, worker, or Vercel proxy service.
- Change `/v1/*` API routing or API Key authentication semantics.
- Change provider connection, combo, RTK Pool, or pricing behavior.

## Decisions

### Use runtime mode from tunnel status

The tunnel status response should remain the single UI source for endpoint mode. On Vercel it should return `unsupported: true`, `publicUrl`, and enough state for the UI to render deployed-endpoint mode without attempting quick tunnel actions.

Alternative considered: add a new endpoint status API. Rejected because `/api/tunnel/status` already models local-vs-Vercel behavior and existing tests cover it.

### Resolve Vercel public endpoint by env priority

Endpoint resolution should continue to prefer explicit `DEVLENS_PUBLIC_API_ENDPOINT`, then `VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`, with trailing slash normalization. Explicit env wins because production deployments may need a custom domain while preview deployments can still use Vercel-provided URLs.

Alternative considered: derive from `window.location.origin` only. Rejected because server-rendered/API status must also expose stable endpoint state and custom endpoint override support.

### Render Vercel as deployed endpoint, not disabled tunnel

The UI should not show Vercel mode as an error or broken tunnel. It should show the deployed endpoint as active/copyable and hide local tunnel enable/disable controls.

Alternative considered: keep Enable button and surface 501 error from `/api/tunnel/enable`. Rejected because it creates a known-dead flow and trains Managers to click a control that cannot work.

### Preserve local tunnel security gates only for local tunnel exposure

Require API Key and login/password warnings remain relevant, but local tunnel activation gates should only block local tunnel activation. Vercel endpoint display should still guide API Key use without implying cloudflared exposure.

Alternative considered: apply all tunnel security warnings to Vercel endpoint display. Rejected because Vercel deployment exposure is inherent to the hosted app, not an optional local tunnel action.

## Risks / Trade-offs

- Vercel env missing usable URL → UI may fall back to `window.location.origin`; tests should cover empty server endpoint behavior.
- Preview URL vs production URL confusion → env priority must be documented in tests and UI copy should call it deployed endpoint.
- Existing local tunnel users regress → local-mode tests must confirm Enable/Disable behavior remains available outside Vercel.
- Terminology drift between Team endpoint and Cloudflare endpoint → specs should call Vercel mode “deployed Team endpoint” and local mode “Cloudflare quick tunnel.”
