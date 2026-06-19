# V1 API Key routing

## Request contract

Clients call `/v1/*` with:

```http
Authorization: Bearer <devlens-api-key>
```

## Required steps

1. Hash presented API Key.
2. Lookup active `apiKeys` row.
3. Join `users` and `teams`.
4. Reject inactive user, inactive key, missing Team.
5. Build request context: `teamId`, `userId`, `apiKeyId`.
6. Resolve Combo, Model Alias, Provider Connection, Pricing Override within `teamId`.
7. Stream via `open-sse/`.
8. Persist usage with Team and Developer.
9. Update `lastUsedAt`.

## Security

Never log plaintext API Key. Mask authorization headers in console logs and request details.
