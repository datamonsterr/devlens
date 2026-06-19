# CLI Config Snippets — Technical

## Architecture

Copyable configuration blocks for AI CLI tools, replacing the removed auto-config writers.

### Supported Tools
- Claude Code: `~/.claude/settings.json` snippet
- OpenCode: `opencode.json` snippet
- Codex: environment variables snippet

### Snippet Composition
Each snippet includes:
- Team API endpoint (canonical base URL from deployment context)
- Developer API Key (plaintext only shown during create/rotate/reveal flows)
- Tool-specific configuration format

### Route
- `src/app/(dashboard)/dashboard/cli-config/` — page component
- Shows tool tabs with copyable config blocks
- API Key shown only during create flow or manual paste

### Security
- Existing keys never re-expose plaintext
- New key creation fills snippet once
- Manual paste mode for existing keys
- Copy control on endpoint and key values

### Deployment Awareness
- Vercel: uses deployed Vercel origin as endpoint
- Local: can expose Cloudflare tunnel endpoint
- Docker: uses configured `NEXT_PUBLIC_BASE_URL`

## Source Files
- `src/app/(dashboard)/dashboard/cli-config/` — page
- `src/shared/components/CliConfigSnippet.js` — snippet renderer
- `src/lib/auth/dashboardSession.js` — key reveal via JWT session
