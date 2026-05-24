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
- Non-English/Vietnamese docs
- Dead shim modules and unused backup files

## New Devlens features

- [Clerk auth](feature_spec/clerk-auth.md)
- [Role-based access](feature_spec/role-based-access.md)
- [Team management](feature_spec/team-management.md)
- [Developer API Keys](feature_spec/developer-api-keys.md)
- [Provider Connections](feature_spec/provider-connections.md)
- [Combos](feature_spec/combos.md)
- [Model Browser](feature_spec/model-browser.md)
- [Pricing Overrides](feature_spec/pricing-overrides.md)
- [RTK Pool](feature_spec/rtk-pool.md)
- [Team-routed API access](feature_spec/team-routed-api-access.md)
- [Usage analytics](feature_spec/usage-analytics.md)
- [CLI Config Snippets](feature_spec/cli-config-snippets.md)
- [Console logs](feature_spec/console-logs.md)
