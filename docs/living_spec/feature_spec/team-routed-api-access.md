# Team-routed API access

## Type

New Devlens behavior over preserved `/v1/*` 9router API.

## Purpose

API Key identity determines Team data boundary and Developer usage attribution.

## Requirements

- `/v1/*` validates `Authorization: Bearer <api-key>`.
- Auth resolves Team, Developer, role, API Key id.
- Router uses Team for Provider Connections, Combos, Model Aliases, Pricing Overrides, RTK Pool, and usage writes.
- Developer role can call `/v1/*`; Manager dashboard role cannot use `/v1/*` unless also Developer via explicit API Key policy later.
- `/v1beta/*` remains for compatibility.

## 9router change

Keep API surface; add API Key Team context before model/provider resolution.
