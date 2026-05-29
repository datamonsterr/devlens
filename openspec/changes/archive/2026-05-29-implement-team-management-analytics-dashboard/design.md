# Design: Team Management + Analytics Dashboard

## Context

Devlens teams own provider connections, combos, pricing, RTK pools, and usage data. Managers must view team-wide analytics and monitor developer activity. Developers already have personal usage views. The dashboard at `/dashboard/team` exists as a team member management interface but lacks:

- Comprehensive usage analytics (per-developer breakdown, charts, trends)
- Request logs with filtering and search
- Per-member usage detail pages
- Performance aggregations for large teams

Current schema includes `usageHistory` (teamId, userId, provider, model, cost, etc.) and `requestDetails` (provider, model, status, latency data). `requestDetails` lacks `teamId` and `userId` for RBAC-compliant filtering.

## Architecture

### Backend

**API Routes** (all require Manager role via `requireManagerContext`):

1. `GET /api/team/overview`
   - Returns aggregated team metrics: total requests, tokens, cost, RTK saved, active developers, error counts
   - Supports date range filtering
   - Response: `{ requests, tokens, cost, rtkSaved, activeUsers, errors: { byStatus, byProvider, byModel }, trends: { dailyRequests: [], dailyCost: [] } }`

2. `GET /api/team/members`
   - Already exists; extend with usage summary fields
   - Returns array of members with `totalRequests`, `totalTokens`, `totalCost`, `lastUsedAt`, `errorCount`

3. `GET /api/team/members/:id/usage`
   - Per-member usage breakdown: requests over time, tokens, cost, RTK saved
   - Supports date range, grouping (daily, weekly, monthly)
   - Breakdown by provider, model, endpoint
   - Response: `{ requests, tokens, cost, rtkSaved, byProvider: {...}, byModel: {...}, daily: [{date, requests, cost}], errors: {count, byStatus} }`

4. `GET /api/team/members/:id/logs`
   - Request logs for a specific developer
   - Supports filters: provider, model, endpoint, status, date range
   - Pagination: page, pageSize
   - Response: `{ logs: [{id, timestamp, provider, model, latency, tokens, cost, status}], pagination: {page, totalPages, hasNext} }`

5. `PATCH /api/team/members/:id`
   - Update developer settings (if needed; currently only deactivation)
   - Response: `{ success: true }`

### Database Schema Changes

**1. Add `teamId` and `userId` to `requestDetails`**
   - Migration: Backfill existing rows with `null` (or derive from connection if possible)
   - Indexes: Add `idx_rd_team` on `teamId`, `idx_rd_user` on `userId`
   - Purpose: RBAC filtering; managers can only view their team's logs

**2. Correlation with Usage History**
   - Ensure `usageHistory` and `requestDetails` share a common `id` (requestId) for correlation and debugging.
   - Ownership and filtering in `requestDetails` must rely on the denormalized `teamId` and `userId` fields.

**3. Optional: Add `requestDetails` logging to router**
   - Currently `saveRequestDetail` is not called anywhere in router
   - If implementing logs UI, wire up router to populate `requestDetails` with `teamId`, `userId`, latency metrics

### Repository Changes

**Usage Analytics** (`usageRepo.js`):
- Extend `getUsageHistory` to support aggregations: `groupBy` (provider, model, endpoint)
- Add `getUsageSummary(teamId, filter)` to return high-level aggregates
- Ensure `teamId` and `userId` filtering works

**Request Details** (`requestDetailsRepo.js`):
- Update `saveRequestDetail` to accept `teamId`, `userId` in detail object
- Update `getRequestDetails` to filter by `teamId`, `userId` when provided
- Ensure schema migration adds columns before write code expects them

### RBAC Strategy

1. **Authentication**: `requireManagerContext()` returns `{ teamId, clerkOrgId, userId, role }` (already implemented)
2. **Authorization**: All team analytics APIs check that requesting user is Manager in their own team
3. **Data Isolation**: Filter all queries by `teamId` at the repository level (no cross-team leakage in usageHistory, requestDetails, or API responses)
4. **Developers**: Cannot access `/api/team/*` endpoints; developers have personal usage at `/api/developer/usage`

### Frontend Structure

**New Pages**:
- `/dashboard/team/analytics` — Overview dashboard with KPI cards, charts, top users, provider distribution
- `/dashboard/team/members/:id/usage` — Per-member usage detail page with charts and breakdown

**Updates to `/dashboard/team`**:
- Add navigation to analytics
- Link member table rows to detail pages
- Extend member table with columns: `Total Requests`, `Total Tokens`, `Total Cost`, `Error Count`, `Last API Request` (derived from `usageHistory` most recent timestamp for that developer)
- Lazy-load usage summary for each member in table

**New Components**:
- `<UsageOverview />` — KPI cards, total metrics
- `<UsageTrendChart />` — Line chart of requests/cost over time
- `<ProviderDistribution />` — Pie/bar chart of usage by provider
- `<ErrorAnalytics />` — Error count breakdown
- `<MemberUsageRow />` — Table row with summary stats for a member
- `<RequestLogsTable />` — Paginated, filterable table of request logs with search
- `<LogsFilter />` — Multi-select provider, model, status, date range

**Data Loading**:
- Use React Query or fetch with caching to load team overview on `/dashboard/team/analytics` mount
- Per-member detail pages fetch `GET /api/team/members/:id/usage` with date range params
- Logs table fetches `GET /api/team/members/:id/logs` on demand with pagination and filters

## Query Optimization Strategy

1. **Indexes**:
   - `usageHistory`: already indexed by `teamId`, `userId`, `timestamp`
   - `requestDetails`: add `teamId`, `userId` with indexes
   
2. **Aggregation Strategy**:
   - **Team Overview Trends**: Use `usageDaily` (lightweight daily JSON aggregates) for high-level team-wide request and cost trends.
   - **Per-Member/Per-Model Drill-downs**: Query `usageHistory` directly using indexed filters (`teamId`, `userId`, `timestamp`, `model`) for granular analysis on member detail pages. This preserves `usageDaily` performance while providing flexibility.
   - Implement SQL aggregates (SUM, COUNT, GROUP BY) at the database level for `usageHistory` queries.
   
3. **Pagination**:
   - Logs always paginated (50 items/page by default)
   - Trends limited to last 30 days unless explicitly requested otherwise
   
4. **Caching**:
   - Cache team overview for 30s (high-level metrics don't need sub-second freshness)
   - Per-member usage cached for 60s

## Risks / Trade-offs

- **Missing `teamId`/`userId` in `requestDetails`**: If router is not updated to populate these, logs filtering will fail silently (return empty). Address by adding logging to router before implementing logs UI.
- **Large datasets**: Teams with 100k+ requests/month will see slow queries if indexes are missing. Mitigation: Ensure all indexes created in migration; consider date-range limits in UI defaults.
- **Real-time expectations**: Usage is aggregated once per request; no live dashboards. Communicate batch window to users.

## Performance Targets

- `/api/team/overview`: < 200ms (with date range limiting to 30 days)
- `/api/team/members/:id/usage`: < 300ms (with aggregation by day)
- `/api/team/members/:id/logs`: < 400ms (pagination, 50 items)
- Frontend: Charts render within 2s of page load
