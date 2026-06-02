# Team Management — Technical

## Architecture

Team maps 1:1 to Clerk Organization. Manager creates team, invites developers.

### Data Model
```sql
teams:
  id TEXT PRIMARY KEY,       -- matches Clerk org ID
  name TEXT,
  rtkPool INTEGER DEFAULT 0,
  createdAt TEXT

users:
  id TEXT PRIMARY KEY,      -- matches Clerk user ID
  teamId TEXT NOT NULL,
  role TEXT NOT NULL,       -- 'manager' | 'developer'
  inviteStatus TEXT,        -- 'pending' | 'onboarded'
  inviteId TEXT,            -- Clerk invitation ID
  onboardingEmailStatus TEXT
```

### Flow
1. Manager signs up → selects "Create Team" → Clerk Org created → `teams` row created
2. Manager invites Developer: `POST /api/team/invite`
   - Creates Clerk Org invitation
   - Creates `users` row with `inviteStatus: 'pending'`
   - Provisions initial API Key
3. Developer receives Clerk invite email → signs up → joins Org
   - Clerk webhook fires: `organizationMembership.created`
   - Role resolved: `organisation:manager` → Manager, otherwise Developer
   - `inviteStatus` updated: `pending` → `onboarded`

### API Routes
| Route | Method | Access |
|-------|--------|--------|
| `/api/team` | GET | Authenticated |
| `/api/team/members` | GET | Manager |
| `/api/team/invite` | POST | Manager |
| `/api/team/members/[id]` | DELETE | Manager |
| `/api/team/settings` | GET, PUT | Manager |
| `/api/team/rtk-pool` | GET, POST | Manager |

### Invite Security
- Self-invite prevented (cannot invite own Clerk user)
- Duplicate invite check across all roles
- Role validation on request body
- Clerk invitation failure returns visible error to Manager
- Dev mode: local invite bypass when Clerk API keys unavailable

### Dev Mode (`DEV_USER_ROLE`)
- Set `DEV_USER_ROLE=developer` or `DEV_USER_ROLE=manager` in `.env`
- Creates/assumes local dev user with specified role
- Bypasses Clerk invitation flow for single-dev testing

## Source Files
- `src/app/(dashboard)/dashboard/team/` — Manager team page
- `src/app/api/team/` — API routes
- `src/lib/db/repos/teamRepo.js` — data access
- `src/lib/auth/teamContext.js` — team resolution
