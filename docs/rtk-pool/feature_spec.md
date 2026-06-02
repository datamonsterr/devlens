# RTK Pool

## Type

New Devlens feature adapted from 9router RTK infrastructure.

## Purpose

Team-level token savings pool consumed when RTK compresses streaming tool results.

## Requirements

- RTK Pool belongs to Team.
- Manager tops up with additive semantics.
- Manager can reset explicitly for billing cycle.
- Streaming `/v1/*` requests atomically decrement pool when savings occur.
- If pool is zero or insufficient, RTK disables for request without failing API call.
- History records allocate, consume, reset actions.

## 9router change

Replace local RTK toggle/state with Team pool accounting.
