# Provider Connections — Technical

## Architecture

Team-scoped upstream AI provider credentials, used by `open-sse/` routing engine.

### Data Model
```sql
providerConnections:
  teamId TEXT NOT NULL,
  provider TEXT NOT NULL,       -- e.g., 'openai', 'anthropic'
  authType TEXT NOT NULL,       -- 'api_key', 'oauth', 'custom'
  credentials TEXT,              -- encrypted JSON
  priority INTEGER,
  isEnabled BOOLEAN,
  lastTestedAt TEXT,
  testStatus TEXT               -- 'ok', 'error', 'pending'
```

### Supported Providers (20+)
OpenAI, Anthropic, Google (Gemini), Azure, Groq, Mistral, Together, DeepSeek, Perplexity, Cohere, xAI, Anthropic/Claude-compatible nodes, OpenAI-compatible nodes, Codex, Cursor, Kiro, GitLab, and more.

### Provider Executors
```
open-sse/executors/
  openai.js       anthropic.js    gemini.js
  azure.js        groq.js         mistral.js
  together.js     deepseek.js     perplexity.js
  cohere.js       antigravity.js  github.js
  kiro.js         codex.js        cursor.js
  ...
```

### Translation Layer
```
open-sse/translator/
  openai-to-anthropic.js   openai-to-gemini.js
  openai-to-cohere.js      ...
```

Standardizes incoming OpenAI-format requests to provider-native formats and back.

### Provider Test
- `POST /api/providers/test` — tests single connection
- `POST /api/providers/test-batch` — tests multiple
- Test: send minimal model list request, check response validity

### Provider Nodes
Custom OpenAI-compatible or Anthropic-compatible endpoints:
- `POST /api/provider-nodes` — add custom node
- Configurable URL, auth header, model list endpoint

### Security
- Credentials stored in DB (encrypted at rest via app-layer encryption)
- Developer never receives credential values in API responses
- Manager dashboard: credentials masked as `cred_****`

## Source Files
- `src/app/api/providers/` — API routes
- `src/app/api/provider-nodes/` — node routes
- `src/lib/db/repos/providerRepo.js` — data access
- `open-sse/executors/` — provider execution
- `open-sse/translator/` — format translation
- `src/app/(dashboard)/dashboard/providers/` — Manager UI
