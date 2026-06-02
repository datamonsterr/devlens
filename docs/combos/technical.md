# Combos — Technical

## Architecture

Combo is ordered model fallback sequence. Named combo resolves via `open-sse/` engine.

### Fallback Semantics
1. Client requests model name
2. Router checks if name is a Combo
3. If combo: resolve each model in order against Team's providers
4. First available model/provider pair wins
5. If all fail: return "all models unavailable" error

### Data Model
```sql
-- combos table
teamId TEXT NOT NULL,
name TEXT NOT NULL,
models TEXT NOT NULL,  -- JSON array of model strings
UNIQUE(teamId, name)
```

### API Routes
| Route | Method | Access |
|-------|--------|--------|
| `/api/combos` | GET | Manager, Developer (browse) |
| `/api/combos` | POST | Manager only |
| `/api/combos/[id]` | PUT, DELETE | Manager only |
| `/api/combos/reorder` | PUT | Manager only |

### Routing Integration
- `open-sse/` resolves combos during request routing
- Combo lookup scoped to `teamId` from API Key context
- Fallback providers resolved from Team's Provider Connections

### Constraints
- Manager creates/edits/reorders/deletes
- Developer browses and uses only
- Combo must reference models available in Team's providers
- Empty combo (no models) returns error

## Source Files
- `src/lib/db/repos/comboRepo.js` — data access
- `src/app/api/combos/` — API routes
- `open-sse/router.js` — combo resolution in routing engine
