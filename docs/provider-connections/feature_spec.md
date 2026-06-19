# Provider Connections

## Type

Preserved 9router feature changed for Devlens.

## Purpose

Team-scoped upstream AI provider credentials used by `/v1/*` routing.

## Requirements

- Provider Connection belongs to Team.
- Manager creates, edits, tests, disables, deletes Provider Connections.
- Developer never sees provider credentials.
- Routing resolves Provider Connections only inside API Key Team.
- Existing provider OAuth/API-key behavior remains unless auth integration requires change.

## 9router change

Add required Team scoping and Manager-only access.
