# Console logs

## Type

Modified 9router feature for Devlens.

## Purpose

Expose safe request/runtime diagnostics without leaking secrets or cross-Developer data.

## Requirements

- Developer sees own request logs only.
- Manager sees Team logs.
- Mask API Keys, provider credentials, tokens, and sensitive headers.
- Logs link to usage entries where possible.
- Raw debug logs with request bodies remain server-side only unless sanitized.

## 9router change

Replace global local logs with role-filtered Team logs.
