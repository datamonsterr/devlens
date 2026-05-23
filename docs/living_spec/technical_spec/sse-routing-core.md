# SSE routing core

## Preserved behavior

- Provider execution adapters stay in `open-sse/executors/`.
- Request/response translation stays in `open-sse/translator/`.
- Combo fallback and provider/account fallback remain.
- Streaming normalization remains.

## Devlens changes

- Every routing call receives Team context.
- Provider credential lookup requires `teamId`.
- Combo and Model Alias lookup requires `teamId`.
- Usage extraction includes `teamId`, `userId`, `apiKeyId`.
- RTK Pool accounting is Team-scoped.

## Non-goals

No provider SDK rewrite for MVP.
