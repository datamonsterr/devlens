## ADDED Requirements

### Requirement: Team management displays Developer invite status
Team management SHALL display pending and onboarded/success status for invited Developers.

#### Scenario: Manager sees pending status
- **WHEN** a Developer has been invited but has not completed onboarding
- **THEN** Team management shows the Developer as pending

#### Scenario: Manager sees onboarded status
- **WHEN** a Developer completes onboarding
- **THEN** Team management shows the Developer as onboarded/success

### Requirement: Team management copyable assigned API Key display
Team management SHALL provide a copy control for assigned Developer API Key display values when those values are available.

#### Scenario: Copy assigned API Key
- **WHEN** a Manager views an assigned Developer API Key value in Team management
- **THEN** the Manager can copy that displayed value using a UI copy control
