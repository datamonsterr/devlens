## ADDED Requirements

### Requirement: Team RTK Pool

Each team SHALL have an RTK token pool represented as an integer. The pool SHALL be set by managers and decremented as developers use RTK during streaming API requests. The pool SHALL NOT go below zero.

#### Scenario: Manager creates RTK pool
- **WHEN** a manager sets the team RTK pool to 500000 via PUT `/api/team/rtk-pool`
- **THEN** the team's `rtk_pool` column is set to 500000

#### Scenario: Manager adds tokens to existing pool
- **WHEN** a manager sends PUT `/api/team/rtk-pool` with `{ amount: 100000 }` and the current pool is 50000
- **THEN** the pool becomes 150000 (additive by default)

### Requirement: RTK Consumption During Requests

The system SHALL decrement the team's RTK pool when a developer's streaming request successfully uses RTK for token savings. The decrement SHALL be the number of tokens saved, not the total tokens used.

#### Scenario: Developer request saves 200 tokens via RTK
- **WHEN** a streaming request saves 200 tokens through RTK and the team pool is 50000
- **THEN** the system decrements the pool to 49800 after the request completes

#### Scenario: RTK pool at zero
- **WHEN** a developer makes a streaming request and the team RTK pool is 0
- **THEN** RTK is disabled for that request; the request proceeds without token savings (no error)

### Requirement: Atomic Pool Decrement

RTK pool decrement SHALL be atomic. Concurrent requests from multiple developers SHALL NOT result in race conditions or negative pool values.

#### Scenario: Concurrent RTK consumption
- **WHEN** two developers make simultaneous streaming requests that each would save 100 tokens, and the pool is 150
- **THEN** one request decrements the pool by 100, the other sees 50 remaining and saves only 50, pool ends at 0 (not negative)

### Requirement: RTK Pool Status API

The system SHALL expose an API endpoint for managers to view the current RTK pool status, including total allocated, remaining, and total consumed.

#### Scenario: Manager checks pool status
- **WHEN** a manager sends GET `/api/team/rtk-pool`
- **THEN** the system returns `{ total_ever_allocated: 500000, remaining: 234500, consumed: 265500 }`

### Requirement: RTK Pool Reset

Managers SHALL be able to reset the RTK pool to a new value, replacing the current remaining amount.

#### Scenario: Manager resets pool
- **WHEN** a manager sends PUT `/api/team/rtk-pool` with `{ amount: 200000, mode: "reset" }`
- **THEN** the pool is set to exactly 200000 regardless of previous remaining value

### Requirement: RTK Savings per Request

Each usage entry SHALL record the RTK tokens saved for that request (0 if RTK was not used or was disabled). This enables managers to see RTK effectiveness over time.

#### Scenario: Usage entry with RTK savings
- **WHEN** a request completes with RTK saving 150 tokens
- **THEN** the usage entry stores `rtk_tokens_saved: 150`

#### Scenario: Usage entry without RTK
- **WHEN** a request completes without RTK (pool empty or feature unused)
- **THEN** the usage entry stores `rtk_tokens_saved: 0`

### Requirement: RTK Pool History

The system SHALL log all RTK pool changes (allocations, resets, consumption events) for audit purposes. Managers SHALL be able to view the history.

#### Scenario: Manager views RTK history
- **WHEN** a manager sends GET `/api/team/rtk-pool/history`
- **THEN** the system returns a chronological list of events: `[{ timestamp, action: "allocate" | "consume" | "reset", amount, remaining_after }]`

### Requirement: Developer RTK Transparency

Developers SHALL be able to see whether RTK is currently active for their team, but SHALL NOT see the pool amount or history. If RTK is disabled (pool at zero), the API response SHALL indicate this.

#### Scenario: Developer checks RTK status via API
- **WHEN** a developer sends GET `/api/rtk/status`
- **THEN** the system returns `{ active: true }` or `{ active: false, message: "RTK pool depleted. Contact your manager." }`

#### Scenario: Developer attempts to view pool amount
- **WHEN** a developer sends GET `/api/team/rtk-pool`
- **THEN** the system returns HTTP 403 Forbidden
