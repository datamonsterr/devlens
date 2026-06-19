# Usage Analytics — Technical

## Architecture

Tenant-attributed cost, token, provider, and RTK analytics.

### Data Model
```sql
usageHistory:
  id TEXT PRIMARY KEY,
  teamId TEXT NOT NULL,
  userId TEXT NOT NULL,
  apiKeyId TEXT,
  endpoint TEXT,
  model TEXT,
  provider TEXT,
  inputTokens INTEGER,
  outputTokens INTEGER,
  cost REAL,
  rtkSaved INTEGER,
  status TEXT,
  timestamp TEXT

usageDaily:
  date TEXT,
  teamId TEXT,
  userId TEXT,
  model TEXT,
  totalInputTokens INTEGER,
  totalOutputTokens INTEGER,
  totalCost REAL
```

### API Routes
| Route | Purpose | Access |
|-------|---------|--------|
| `/api/usage/chart` | Time-series usage data | Manager (team), Developer (own) |
| `/api/usage/dashboard` | Dashboard summary stats | Role-filtered |
| `/api/usage/developers` | Per-developer breakdown | Manager |
| `/api/usage/history` | Request history | Role-filtered |
| `/api/usage/logs` | Request logs (masked) | Role-filtered |
| `/api/usage/me` | Own usage | Developer |
| `/api/usage/providers` | Provider distribution | Manager |
| `/api/usage/request-details` | Single request detail | Manager |
| `/api/usage/request-logs` | Raw logs (masked) | Manager |
| `/api/usage/stats` | Aggregate stats | Role-filtered |
| `/api/usage/stream` | SSE usage stream | Manager |
| `/api/reports/ai-roi` | AI ROI report generation | Manager |

### Cost Calculation
- Pricing Override (manual) takes precedence over auto pricing
- Auto pricing derived from provider `/models` response
- `cost = (inputTokens * inputPrice) + (outputTokens * outputPrice)`
- RTK savings: `rtkSaved` tokens counted, cost not charged

### Manager vs Developer
- Manager: team aggregate + per-developer + all models/providers
- Developer: own usage only, own models
- Filtering enforced by query: `WHERE teamId = ? [AND userId = ?]`

### AI ROI Reports
- `POST /api/reports/ai-roi` with `{ startDate, endDate, memberIds }`
- Aggregates: total cost, saved cost, provider distribution, growth rate
- `data_quality_notes` for partial/missing telemetry
- HTML email template with chart embeddings (future)

### Recharts Integration
- Usage trends: line chart (time × cost/tokens)
- Provider distribution: pie chart
- Error rate: bar chart
- Developer breakdown: table with sparklines

## Source Files
- `src/app/(dashboard)/dashboard/usage/` — Manager usage page
- `src/app/(dashboard)/dashboard/reports/` — ROI reports
- `src/app/api/usage/` — API routes
- `src/app/api/reports/` — report routes
- `src/lib/db/repos/usageRepo.js` — data access
- `src/lib/usage/` — usage fetcher
- `src/shared/components/UsageStats.js` — stats component
