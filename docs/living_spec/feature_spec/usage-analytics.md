# Usage analytics

## Type

Modified 9router feature for Devlens.

## Purpose

Track cost, tokens, provider/model distribution, RTK savings, and request outcomes by Team and Developer.

## Requirements

- Usage event stores Team and Developer identity.
- Manager sees Team aggregate and per-Developer breakdown.
- Developer sees own usage only.
- Removed Developers remain in historical reports.
- Pricing Overrides drive cost calculations.
- RTK savings appear as saved tokens.

## 9router change

Move from local request history to tenant-attributed analytics.
