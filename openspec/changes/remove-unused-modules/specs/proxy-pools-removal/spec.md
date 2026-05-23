## ADDED Requirements

### Requirement: Proxy pool repository deleted

The file `src/lib/db/repos/proxyPoolsRepo.js` SHALL be deleted. All CRUD operations for proxy pools SHALL be removed.

#### Scenario: Proxy pool repo file removed
- **WHEN** a developer searches for `proxyPoolsRepo.js`
- **THEN** the file does not exist

### Requirement: Proxy pool schema table removed

The `proxyPools` table definition SHALL be removed from `src/lib/db/schema.js`. New database installations SHALL NOT create a `proxyPools` table.

#### Scenario: Schema has no proxyPools table
- **WHEN** the database schema is inspected
- **THEN** no `CREATE TABLE proxyPools` statement exists

### Requirement: Proxy pool DB exports removed

The DB barrel file (`src/lib/db/index.js`) SHALL NOT export proxy pool functions (`getProxyPools`, `getProxyPoolById`, `createProxyPool`, `updateProxyPool`, `deleteProxyPool`).

#### Scenario: DB index has no proxy pool exports
- **WHEN** importing from `@/lib/db`
- **THEN** no proxy pool functions are available

### Requirement: Proxy pool re-exports removed from shims

`src/lib/localDb.js` and `src/models/index.js` SHALL NOT re-export proxy pool functions.

#### Scenario: LocalDb has no proxy pool exports
- **WHEN** importing from `@/lib/localDb`
- **THEN** no proxy pool functions are available

### Requirement: Proxy pool API routes deleted

All 5 proxy pool API routes SHALL be deleted:
- `src/app/api/proxy-pools/route.js`
- `src/app/api/proxy-pools/[id]/route.js`
- `src/app/api/proxy-pools/[id]/test/route.js`
- `src/app/api/proxy-pools/vercel-deploy/route.js`
- `src/app/api/proxy-pools/cloudflare-deploy/route.js`

#### Scenario: Proxy pool API routes return 404
- **WHEN** any request is made to `/api/proxy-pools*`
- **THEN** the system returns HTTP 404

### Requirement: Proxy pool dashboard page deleted

The dashboard page at `src/app/(dashboard)/dashboard/proxy-pools/page.js` SHALL be deleted.

#### Scenario: Proxy pool dashboard page removed
- **WHEN** a user navigates to `/dashboard/proxy-pools`
- **THEN** the route does not exist (Next.js returns 404)

### Requirement: Proxy pool resolution removed from connection proxy

The `connectionProxy.js` module SHALL NOT resolve proxy configuration from proxy pools. It SHALL only use legacy proxy config per connection.

#### Scenario: Connection proxy resolves without pool lookup
- **WHEN** a provider connection is established
- **THEN** proxy configuration is derived from connection-level proxy settings only, with no pool query

### Requirement: Proxy pool UI removed from provider connection editing

Provider connection editing UI (`ConnectionRow.js`, `AddApiKeyModal.js`) SHALL NOT render a proxy pool dropdown. The connection editing page SHALL NOT reference proxy pool data.

#### Scenario: Connection editing has no proxy pool dropdown
- **WHEN** a manager edits a provider connection
- **THEN** the UI shows only connection-level proxy fields, no pool selector

### Requirement: Proxy pool references removed from usage components

Usage tracking components SHALL NOT reference proxy pool data or functions.

#### Scenario: Usage components have no proxy pool imports
- **WHEN** usage components are inspected
- **THEN** no proxy pool imports or references exist
