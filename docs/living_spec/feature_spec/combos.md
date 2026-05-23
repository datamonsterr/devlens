# Combos

## Type

Preserved 9router feature changed for Devlens.

## Purpose

Combo is ordered model fallback sequence configured by Manager and consumed by Developers.

## Requirements

- Combo belongs to Team.
- Manager can create, edit, reorder, delete Combos.
- Developer can browse and use Combo names.
- `/v1/*` resolves Combo only in API Key Team.
- Fallback semantics from 9router remain.

## 9router change

Add Team scope and Developer read-only access.
