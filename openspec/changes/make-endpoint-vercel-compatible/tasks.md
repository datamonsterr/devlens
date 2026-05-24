## 1. Worktree And Baseline

- [x] 1.1 Create implementation worktree under `./worktrees/make-endpoint-vercel-compatible` and copy `.env` from the main worktree.
- [x] 1.2 Run `npm install` in the worktree and inspect available build, lint, typecheck, and test scripts.
- [x] 1.3 Read living specs relevant to Team endpoint, dashboard navigation, and Vercel deployment behavior before changing code.

## 2. Runtime Endpoint Semantics

- [x] 2.1 Confirm `src/lib/tunnel/tunnelManager.js` Vercel endpoint resolution normalizes `DEVLENS_PUBLIC_API_ENDPOINT`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_URL` correctly.
- [x] 2.2 Ensure Vercel tunnel status includes enough fields for UI mode detection: unsupported quick tunnel, deployed public URL, no running cloudflared process.
- [x] 2.3 Ensure quick tunnel enable/disable APIs on Vercel do not spawn, kill, download, or health-check cloudflared and return the deployed endpoint consistently.

## 3. Endpoint Dashboard UI

- [x] 3.1 Update `EndpointPageClient` state handling to detect Vercel/deployed endpoint mode from tunnel status.
- [x] 3.2 Display the deployed Team API endpoint as `<publicUrl>/v1` on Vercel, falling back safely to `window.location.origin/v1` only when no server public URL exists.
- [x] 3.3 Hide local Cloudflare quick tunnel Enable/Disable controls, cloudflared progress messaging, and tunnel reconnect/checking UI in Vercel mode.
- [x] 3.4 Replace Cloudflare-specific copy with deployed endpoint guidance in Vercel mode while preserving local Cloudflare tunnel copy outside Vercel.
- [x] 3.5 Preserve API Key guidance and endpoint copy behavior for Managers and Developers.

## 4. Tests

- [x] 4.1 Extend tunnel Vercel unit tests to cover env priority, trailing slash normalization, and no cloudflared spawn behavior.
- [x] 4.2 Add or update Endpoint page tests so Vercel mode shows deployed endpoint and hides quick tunnel controls.
- [x] 4.3 Add or update local-mode tests to confirm quick tunnel controls still appear outside Vercel when security gates pass.

## 5. Verification And Specs

- [x] 5.1 Run relevant unit tests for tunnel and endpoint behavior.
- [x] 5.2 Run project lint and typecheck commands discovered in setup.
- [x] 5.3 Run build if available and practical for this change.
- [x] 5.4 Update living specs after behavior changes, including Vercel deployed Team endpoint behavior.
- [x] 5.5 Validate OpenSpec change status before handoff.
