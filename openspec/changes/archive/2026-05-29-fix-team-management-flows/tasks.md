## 1. Database Migration — Indexes for Analytics Performance

- [x] 1.1 Create `src/lib/db/migrations/009-add-analytics-indexes.mjs` with:
  - `CREATE INDEX IF NOT EXISTS idx_usageHistory_team_user ON usageHistory(teamId, userId)`
  - `CREATE INDEX IF NOT EXISTS idx_usageHistory_timestamp ON usageHistory(timestamp)`
  - `CREATE INDEX IF NOT EXISTS idx_requestDetails_team_user ON requestDetails(teamId, userId)`
- [x] 1.2 Register m009 in the migrations index (`src/lib/db/migrations/index.js`)
- [x] 1.3 Bump `SCHEMA_VERSION` from 8 to 9 in `src/lib/db/schema.js`
- [x] 1.4 Run the migration and verify indexes exist

## 2. Extract Invite + API Key Creation Into Shared Service

- [x] 2.1 Read the full invite logic in `src/app/api/team/members/route.js`
- [x] 2.2 Create `src/lib/team/inviteService.js` with a `createTeamMember` function
- [x] 2.3 Import and use `createTeamMember` in `src/app/api/team/members/route.js`

## 3. Make `POST /api/team/members` Dev-Resilient

- [x] 3.1 Read the current route handler to understand the Clerk call
- [x] 3.2 Wrap the Clerk Organization invitation call in try/catch with dev fallback
- [x] 3.3 When Clerk fails and dev fallback is active, continue with local user creation
- [x] 3.4 In dev fallback mode, include `password` field in the API response
- [x] 3.5 Set `onboardingEmailStatus = 'skipped'` when fallback is used

## 4. Make `logUsage` Console-Only

- [x] 4.1 Remove `saveRequestUsage` and `appendRequestLog` calls from `logUsage`
- [x] 4.2 Verify `saveUsageStats` is the sole DB persistence path (already correct)
- [x] 4.3 Add stable `requestId` to `saveUsageStats` for future idempotency

## 5. Frontend: Analytics Auto-Refresh

- [x] 5.1 Add 30-second auto-refresh with visibility detection to analytics page
- [x] 5.2 Re-fetch only overview data, no full page reload

## 6. Sidebar Consistency

- [x] 6.1 Sidebar uses `useRole` hook (verified working from demo)
- [x] 6.2 Team Management links present for manager role (verified)

## 7. Demo Seed Script

- [x] 7.1 Create `scripts/demo-seed.mjs` with 7 days of usage data, pricing overrides, multi-user
- [x] 7.2 Add `demo:seed` script entry to `package.json`
- [x] 7.3 Run seed and verify completion (175 rows, 7 day aggregates)
- [x] 7.4 Verify data appears in analytics and member detail endpoints

## 8. Frontend Polish for Demo

- [x] 8.1 `useRole` hook resolves quickly (not stuck on "Loading role")
- [x] 8.2 Member detail page renders with seeded data
- [x] 8.3 Logs page filters work with seeded data

## 9. Verification

- [x] 9.1 Full demo flow tested: login → invite dev → login as dev → check analytics
- [x] 9.2 `npm run lint` — 0 errors, 54 warnings (no new warnings)
- [x] 9.3 Living specs synced via living-spec-syncer
- [x] 9.4 Change ready for archive
