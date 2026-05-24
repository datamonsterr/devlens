## ADDED Requirements

### Requirement: Clerk invitation creates usable Team join path
The system SHALL create a Clerk invitation that lets the invited Developer join the Manager's Team.

#### Scenario: Invited account receives Team join path
- **WHEN** a Manager invites a Developer email
- **THEN** Clerk receives an invitation request scoped to the Manager's Team
- **AND** the invited account can accept the invitation and join that Team

### Requirement: Invite success reflects Clerk success
The system MUST base invite API success on successful Clerk invitation creation instead of local persistence alone.

#### Scenario: Local record succeeds but Clerk fails
- **WHEN** local invitation data is saved but Clerk invitation creation fails
- **THEN** the invite API reports failure
- **AND** the Developer is not shown as successfully invited
