# Usage analytics

## Type

Modified 9router feature for Devlens.

## Purpose

Track cost, tokens, provider/model distribution, RTK savings, and request outcomes by Team and Developer.

## Requirements

- Usage event stores Team and Developer identity.
- Manager sees Team aggregate and per-Developer breakdown.
- Manager can generate Team AI ROI reports from Team-scoped analytics data.
- AI ROI report UI lives at `/dashboard/reports` and is Manager-only.
- AI ROI report generation uses `POST /api/reports/ai-roi` with Team-scoped date/member filters.
- AI ROI API normalizes AI output into stable JSON shape and returns `data_quality_notes` when telemetry is missing or partial.
- Developer sees own usage only.
- Removed Developers remain in historical reports.
- Pricing Overrides drive cost calculations.
- RTK savings appear as saved tokens.

## 9router change

Move from local request history to tenant-attributed analytics.
