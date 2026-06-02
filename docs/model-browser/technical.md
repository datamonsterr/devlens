# Model Browser — Technical

## Architecture

Team-aware model discovery page showing available models, combos, providers, capabilities, and pricing.

### Data Sources
1. **Provider models**: fetched from Provider Connections' `/models` endpoints
2. **Combos**: team combos with first-resolved model info
3. **Custom models**: team-defined model aliases from `kv` store
4. **Pricing**: Pricing Overrides (manual) or auto pricing (provider-derived)

### API
| Route | Method | Access |
|-------|--------|--------|
| `/api/models/browse` | GET | Manager, Developer |
| `/api/models/alias` | POST, DELETE | Manager only |
| `/api/models/availability` | GET | Manager, Developer |
| `/api/models/custom` | GET | Manager, Developer |

### Filtering
- Models filtered to Team's active Provider Connections
- Disabled models excluded from list
- Combo resolution shows first available model/provider

### Role Differences
- Manager: sees management links (edit providers, combos, pricing)
- Developer: read-only browse, copy model names for CLI use

### Model Capabilities Display
- Context window size
- Input/output token pricing
- Provider information
- Streaming support indicator
- Tool/function calling support

## Source Files
- `src/app/(dashboard)/dashboard/models/` — page
- `src/app/api/models/` — API routes
- `src/lib/db/repos/` — kv store for aliases, custom models
- `src/shared/components/ModelSelectModal.js` — model picker
