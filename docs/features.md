# Features

Source of truth for Devlens feature specs. OpenSpec wins when code and docs disagree.

## Current 9router features preserved

- OpenAI-compatible `/v1/*` API
- Provider routing and format translation via `src/sse/` and `open-sse/`
- Provider Connection management
- Combo fallback routing
- Model Alias support
- Pricing display/override foundation
- Usage tracking and request logs
- Cloudflared team endpoint locally; Vercel deployments use the deployed Vercel URL as the API endpoint

## 9router features to change for Devlens

- Single-user local auth → Clerk Team auth
- Local API keys → per-Developer HMAC API Keys
- Global resources → Team-scoped resources
- Individual usage → Team and Developer attribution
- Local JSON assumptions → SQLite Team schema
- CLI auto-config tools → copyable CLI Config Snippets
- Orange/9Router branding → blue-purple Devlens branding

## 9router features to remove

- JWT/password dashboard auth
- MITM module and routes
- Cloud sync/device sync
- Tailscale tunnel provider
- Proxy Pools
- CLI auto-config writers
- Legacy Donate, Changelog, Remote, and Shutdown UI actions
- Non-English/Vietnamese docs (i18n content, not framework)
- Dead shim modules and unused backup files

## New Devlens features

| Feature | Folder | Status |
|---------|--------|--------|
| Clerk auth | [clerk-auth/](./clerk-auth/) | Implemented |
| Role-based access | [role-based-access/](./role-based-access/) | Implemented |
| Team management | [team-management/](./team-management/) | Implemented |
| Developer API Keys | [developer-api-keys/](./developer-api-keys/) | Implemented |
| Developer invite onboarding | Covered in [team-management/](./team-management/) and [clerk-auth/](./clerk-auth/) | Implemented |
| Provider Connections | [provider-connections/](./provider-connections/) | Implemented |
| Combos | [combos/](./combos/) | Implemented |
| Model Browser | [model-browser/](./model-browser/) | Implemented |
| Pricing Overrides | [pricing-overrides/](./pricing-overrides/) | Implemented |
| RTK Pool | [rtk-pool/](./rtk-pool/) | Implemented |
| Team-routed API access | [team-routed-api-access/](./team-routed-api-access/) | Implemented |
| Usage analytics | [usage-analytics/](./usage-analytics/) | Implemented |
| CLI Config Snippets | [cli-config-snippets/](./cli-config-snippets/) | Implemented |
| Console logs | [console-logs/](./console-logs/) | Implemented |

## Future Features (not yet implemented)

- All OAuth providers with Devlens client IDs
- Manager chatbot with AI SDK + tool calls
- Platform-specific CLI setup guides (Linux, Windows, Mac)
- Remove all 9router brand references from repo
- Compact UI redesign
- API latency reduction
- CI/CD: automated test, format, lint, code review + improved e2e/integration/unit coverage
- Vercel feature flags + restructured settings page
- Onboarding email for team manager inviting developers
- GitBook documentation update
