# Removal plan

## Remove from Devlens

- JWT/password dashboard auth.
- MITM module and routes.
- Cloud sync/device sync.
- Tailscale tunnel provider.
- Proxy Pools.
- CLI auto-config writers/checkers.
- Legacy Donate, Changelog, Remote, and Shutdown UI actions.
- i18n docs not used by Devlens.
- Dead shim modules and backup files.

## Keep

- Cloudflared tunnel.
- `/v1/*` and `/v1beta/*` compatibility APIs.
- `open-sse/` routing core.
- Provider adapters.

## Order

1. Delete isolated routes/files.
2. Remove imports and shared state.
3. Remove UI navigation and props.
4. Remove schema entries for new installs.
5. Run build, lint, tests.
