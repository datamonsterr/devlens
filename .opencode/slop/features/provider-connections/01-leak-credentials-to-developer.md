# Send provider credentials to Developer API response

**Severity**: critical
**Layer**: features/provider-connections

## What went wrong

Agent's API response included provider credential values (API keys, OAuth tokens) in responses visible to Developers.

## What should have happened

- Manager APIs: return credentials masked as `cred_****`
- Developer APIs: never return credential fields at all
- Provider test endpoints: never echo credentials in responses
- Dashboard UI: show masked values with copy/edit controls (Manager only)

## Why it matters

Provider credentials grant access to paid upstream AI services. Leaking them to Developers means unauthorized direct API access outside Devlens control, bypassing usage tracking and pricing.

## How to avoid

- Read `docs/provider-connections/feature_spec.md`: "Developer never sees provider credentials"
- Always strip/redact `credentials` field in API responses for non-Manager roles
- Check `requireManagerContext()` guard on credential-related API routes
- Test: call provider list API as Developer, verify credentials are absent
