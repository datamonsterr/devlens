# Console Logs — Technical

## Architecture

Role-filtered request diagnostics with secret masking.

### Role Filtering
- Developer: sees only own request logs
- Manager: sees all Team logs
- Filtering enforced at API level via `teamId` + `userId`

### Secret Masking
Apply before rendering to client:
- API Key values → `sk-****`
- Provider credentials → `cred_****`
- Tokens (Bearer, refresh) → `tok_****`
- Sensitive headers → `***`
- Request body fields matching credential patterns → masked

### Source
- `src/app/(dashboard)/dashboard/console-log/` — page
- `src/app/api/usage/logs/` — log retrieval API
- `src/app/api/usage/request-logs/` — request detail logs
- Raw debug logs stored server-side only (log.txt, usage.json patterns)

### Linkage
- Log entries link to `usageHistory` entries when `requestId` matches
- Manager can drill from log → usage detail

### Data Flow
1. `/v1/*` request completes → usage event written with `teamId`, `userId`, `apiKeyId`
2. Console log page fetches via `GET /api/usage/logs` (filtered by auth context)
3. Server applies masking before response
4. Client renders with masked values and copy controls

## Source Files
- `src/app/(dashboard)/dashboard/console-log/` — page
- `src/app/api/usage/logs/` — API
- `src/app/api/usage/request-logs/` — API
- `src/lib/db/repos/usageRepo.js` — data access
