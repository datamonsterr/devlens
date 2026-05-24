# Developer API Keys

## Type

Modified 9router feature for Devlens.

## Purpose

API Key grants Developer access to `/v1/*` and attributes usage to Team and Developer.

## Requirements

- API Key belongs to Developer and Team.
- Plaintext shown only once at creation or rotation.
- Store HMAC hash, never reusable plaintext.
- Developer can create/rotate/revoke own keys.
- Developer API access view shows canonical API base URL with copy control.
- Developer API access view shows API Key plaintext only during create/rotate/reveal flows; otherwise shows metadata plus create/rotate guidance.
- Manager can inspect metadata and revoke keys.
- Manager creates a Developer's initial API Key only through Team management invite/member flow.
- Manager-created initial API Key assignment is idempotent and limited to one per Developer and Team.
- Manager Team management copy controls copy displayed assigned API Key values only; stored secret material is not re-exposed after creation.
- Team settings define per-Developer quota.

## 9router change

Move from machine/local API keys to per-Developer Team API Keys.
