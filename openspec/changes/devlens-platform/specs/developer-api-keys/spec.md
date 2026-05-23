## ADDED Requirements

### Requirement: API Key Creation

API keys SHALL be available only to Developer role users. A developer SHALL be able to create API keys for accessing the `/v1/*` compatibility endpoints. The key value SHALL be generated server-side, shown in plaintext only once upon creation, and stored as an HMAC hash. Managers SHALL NOT be able to create API keys for themselves.

#### Scenario: Developer creates first API key
- **WHEN** a developer sends POST `/api/keys` with `{ name: "My CLI Key" }`
- **THEN** the system generates a key, stores its hash with the developer's user_id, and returns HTTP 201 with the plaintext key value once

#### Scenario: Developer attempts to view existing key value
- **WHEN** a developer sends GET `/api/keys/:id`
- **THEN** the system returns the key metadata (name, created_at, last_used_at) but NOT the plaintext key value

#### Scenario: Developer exceeds team key quota
- **WHEN** a developer tries to create a key beyond the team's `maxKeysPerDeveloper` limit
- **THEN** the system returns HTTP 400 "API key limit reached"

### Requirement: API Key Revocation

A developer SHALL be able to revoke their own API keys. A manager SHALL be able to revoke any API key in their team. Revoked keys SHALL immediately stop working for API authentication.

#### Scenario: Developer revokes own key
- **WHEN** a developer sends DELETE `/api/keys/:id` for a key they own
- **THEN** the system sets `is_active = false` and the key no longer authenticates requests

#### Scenario: Manager revokes a developer's key
- **WHEN** a manager sends DELETE `/api/keys/:id` for a key belonging to a developer in their team
- **THEN** the system sets `is_active = false`

#### Scenario: Developer attempts to revoke another developer's key
- **WHEN** a developer sends DELETE `/api/keys/:id` for a key they do not own
- **THEN** the system returns HTTP 404 (not found in their scope)

### Requirement: API Key Rotation

A developer SHALL be able to rotate an API key. Rotation SHALL create a new key and revoke the old one in a single operation.

#### Scenario: Developer rotates a key
- **WHEN** a developer sends POST `/api/keys/:id/rotate`
- **THEN** the system generates a new key, revokes the old key, and returns HTTP 200 with the new plaintext key value

### Requirement: API Key Authentication

The system SHALL validate API keys on every request to `/v1/*` endpoints. Valid keys SHALL resolve to the associated developer user and team. Invalid, expired, or revoked keys SHALL result in HTTP 401.

#### Scenario: Valid key authenticates request
- **WHEN** a request to `/v1/chat/completions` includes `Authorization: Bearer <valid-key>`
- **THEN** the system resolves the user_id and team_id, allows the request, and tracks usage against that user

#### Scenario: Revoked key authenticates request
- **WHEN** a request includes a key that was previously revoked
- **THEN** the system returns HTTP 401 "API key revoked"

#### Scenario: Missing authorization header
- **WHEN** a request to `/v1/*` has no Authorization header
- **THEN** the system returns HTTP 401 "Authorization required"

### Requirement: Key Usage Tracking

The system SHALL track the last used timestamp for each API key. Each authenticated request SHALL update `last_used_at` on the corresponding key record.

#### Scenario: Key usage timestamp update
- **WHEN** a developer makes an API call with their key
- **THEN** the system updates the key's `last_used_at` to the current timestamp

### Requirement: Key Listing

A developer SHALL be able to list all their active API keys. A manager SHALL be able to list all API keys across their team.

#### Scenario: Developer lists own keys
- **WHEN** a developer sends GET `/api/keys`
- **THEN** the system returns all keys belonging to that developer (without key values)

#### Scenario: Manager lists team keys
- **WHEN** a manager sends GET `/api/keys?team_id=<id>`
- **THEN** the system returns all keys for all developers in the team

### Requirement: Key Naming

Each API key SHALL have a user-provided name for identification purposes. Names SHALL be unique per user but not globally.

#### Scenario: Developer creates key with duplicate name
- **WHEN** a developer sends POST `/api/keys` with a name they already used for another key
- **THEN** the system returns HTTP 400 "Key name already exists"
