# Developer API Keys — Technical

## Architecture

HMAC-hashed per-developer credentials for `/v1/*` API access.

### Key Lifecycle
1. **Create**: Developer or Manager creates key → HMAC hash stored, plaintext shown once
2. **Rotate**: New HMAC replaces old, plaintext shown once
3. **Revoke**: Key marked inactive, cannot be reactivated
4. **Reveal**: plaintext only during create/rotate/reveal flows

### HMAC Scheme
```
plaintext = auto-generated UUID/crypto string
hash = HMAC-SHA256(plaintext, API_KEY_SECRET)
stored_value = hash
```

### API Key Auth Flow (see `team-routed-api-access/technical.md`)
1. Client sends `Authorization: Bearer <key>`
2. HMAC hash computed from received key
3. Lookup active `apiKeys` by hash
4. Join `users` and `teams` for role/team context
5. Reject inactive or missing keys
6. Build auth context: `{ teamId, userId, role, apiKeyId }`

### Per-Developer Quota
- `teamSettings.maxKeysPerDeveloper` limits keys per developer
- Checked at key creation time
- Manager override: revoke others if at limit

### Manager Access
- Inspect metadata (name, created, lastUsed) from Team management
- Revoke any team member's key
- Create initial key only through invite/member flow
- Cannot re-expose stored secrets after creation

## Source Files
- `src/lib/apiKeyUtils.js` — key generation, hashing, verification
- `src/lib/db/repos/apiKeyRepo.js` — key CRUD
- `src/app/api/keys/` — API routes
- `src/app/api/v1/*` — key auth middleware
