# Tasks: Team Management + Analytics Dashboard

## 1. Schema and data foundations

- [x] 1.1 Add `teamId TEXT` and `userId TEXT` columns to `requestDetails` table in `schema.js`; add indexes `idx_rd_team` and `idx_rd_user`
- [x] 1.2 Create migration to backfill `teamId`/`userId` on existing `requestDetails` rows from matching `usageHistory` records (by timestamp + model + provider)
- [x] 1.3 Update `saveRequestDetail` in `requestDetailsRepo.js` to persist `teamId` and `userId` from the detail object into the new columns
- [x] 1.4 Wire `saveRequestDetail` calls into the `/v1/*` router so request logs are populated with `teamId`, `userId`, latency, and token data

## 2. Backend APIs — Team overview

- [x] 2.1 Create `GET /api/team/overview` route returning aggregated team metrics (total requests, tokens, cost, RTK saved, active developers, active API keys, error counts by status/provider/model)
- [x] 2.2 Add date-range and period support (`?period=7d|30d|60d`, `?startDate=&endDate=`) to the overview endpoint
- [x] 2.3 Add trend data to overview response: daily request counts and daily cost arrays for the selected period
- [x] 2.4 Add top-users list (top 5 developers by request count) and provider distribution breakdown to overview response

## 3. Backend APIs — Per-member usage and logs

- [x] 3.1 Create `GET /api/team/members/[id]/usage` route returning per-developer usage: requests over time, token breakdown, cost, RTK saved, provider/model distribution
- [x] 3.2 Add date-range and grouping support (daily, weekly) to the per-member usage endpoint
- [x] 3.3 Create `GET /api/team/members/[id]/logs` route returning paginated request logs with filters (provider, model, endpoint, status, date range)
- [x] 3.4 Create `PATCH /api/team/members/[id]` route for manager updates (role change, status toggle); validate manager-only access
- [x] 3.5 Extend existing `GET /api/team/members` to include usage summary fields: `totalRequests`, `totalTokens`, `totalCost`, `errorCount` per member

## 4. RBAC enforcement

- [x] 4.1 Ensure all new team API routes use `requireManagerContext()` and return 401/403 for unauthenticated or non-manager users
- [x] 4.2 Validate that `members/[id]` endpoints verify the target member belongs to the requesting manager's team (no cross-team access)
- [x] 4.3 Ensure developers hitting `/api/team/overview`, `/api/team/members/[id]/usage`, or `/api/team/members/[id]/logs` receive 403

## 5. Frontend — Team analytics overview

- [x] 5.1 Create `/dashboard/team/analytics` page wrapped in `<RoleGuard allowed={["manager"]}>`
- [x] 5.2 Build KPI cards component showing total requests, tokens, cost, RTK saved, active developers, active API keys
- [x] 5.3 Build usage trend chart (requests over time, cost over time) using Recharts
- [x] 5.4 Build provider distribution chart (pie or bar) showing request/cost breakdown by provider
- [x] 5.5 Build error analytics section showing error counts grouped by status, provider, and model
- [x] 5.6 Build top active developers list with request counts, cost, and last-active timestamps

## 6. Frontend — Enhanced member table

- [x] 6.1 Extend `/dashboard/team` member table to include columns: requests, tokens, cost, errors, last active
- [x] 6.2 Add sorting (by requests, cost, last active) and search (by email) to member table
- [x] 6.3 Add click-through from member row to member detail page (`/dashboard/team/members/[id]`)

## 7. Frontend — Member detail page

- [x] 7.1 Create `/dashboard/team/members/[id]` page with profile summary, role, status, API key count
- [x] 7.2 Build per-member usage charts: requests over time, token usage, cost breakdown
- [x] 7.3 Build provider/model breakdown table for the selected member
- [x] 7.4 Build recent request logs section with inline filtering (provider, model, status, date range)
- [x] 7.5 Add pagination to logs section
- [x] 7.6 Link log entries to request detail page if available (`/dashboard/logs/[id]`)

## 8. Frontend — Logs explorer

- [x] 8.1 Create `/dashboard/team/logs` page with full-width searchable logs table
- [x] 8.2 Build advanced filter bar: member select, provider, model, endpoint, API key, status, date range
- [x] 8.3 Implement paginated data loading with page size control
- [x] 8.4 Add request detail link/drawer for viewing full request/response data

## 9. Navigation and integration

- [x] 9.1 Add "Analytics" and "Logs" links to dashboard sidebar under Team section (manager-only visibility)
- [x] 9.2 Add navigation breadcrumbs for member detail and logs pages
- [ ] 9.3 Add date range picker component reusable across analytics, member detail, and logs pages

## 10. Verification

- [x] 10.1 Verify managers can access all team analytics APIs and see correct aggregated data
- [x] 10.2 Verify developers receive 403 on all team analytics and logs endpoints
- [x] 10.3 Verify cross-team isolation: manager cannot view another team's members or usage
- [x] 10.4 Verify filters (date range, provider, model, status) return correct subsets
- [x] 10.5 Verify pagination works correctly on logs endpoints
- [x] 10.6 Verify charts display correct data matching API responses
- [x] 10.7 Run project lint and typecheck
