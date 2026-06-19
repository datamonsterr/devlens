# Re-expose plaintext API key after creation

**Severity**: critical
**Layer**: features/developer-api-keys

## What went wrong

Agent built API key display that re-exposes the HMAC-stored key, or shows plaintext outside the create/rotate/reveal flow.

## What should have happened

- Plaintext shown ONLY during create/rotate/reveal flows
- After those flows: show metadata only (name, created, lastUsed)
- Manager can copy displayed key during initial assignment, but never re-expose
- Stored value is HMAC hash — cannot be reversed to plaintext

## Why it matters

This is a security requirement. API Keys grant access to `/v1/*` and consume Team resources. Re-exposure or storage of plaintext breaks the security model.

## How to avoid

- Read `docs/developer-api-keys/feature_spec.md` requirements
- HMAC hash is one-way — once stored, plaintext is unrecoverable
- "Reveal" flow: generate NEW key (rotate), show plaintext once
- Never cache plaintext in state or localStorage
- Mask displayed keys as `sk-****` in all non-reveal views
