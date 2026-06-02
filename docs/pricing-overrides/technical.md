# Pricing model

## Concepts

- Auto pricing: provider-derived default where available.
- Pricing Override: Manager-defined Team price.
- Manual source wins over auto source.

## Storage

`pricingOverrides(teamId, model, inputPrice, outputPrice, source)`.

## Usage calculation

Usage event token counts combine with Team pricing at write or analytics aggregation time. Prefer storing calculated `cost` on usage event plus metadata for recalculation if pricing changes.

## Visibility

- Manager can edit.
- Developer can view.
