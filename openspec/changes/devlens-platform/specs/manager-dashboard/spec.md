## ADDED Requirements

### Requirement: Aggregate Usage Overview

The manager dashboard SHALL display aggregate usage metrics for the manager's team, including total tokens consumed, total cost, total requests, and active developer count for a selected time period.

#### Scenario: Manager views current month usage
- **WHEN** a manager navigates to the dashboard with default "This Month" filter
- **THEN** the system displays total tokens, total cost (USD), total requests, and number of active developers for the current month

#### Scenario: Cost displays zero when pricing not configured
- **WHEN** a manager views the dashboard and no pricing is configured for any model
- **THEN** the system displays total cost as $0.00 and per-model cost as $0.00

#### Scenario: Manager switches time period
- **WHEN** a manager selects "Last 7 Days" from the time period filter
- **THEN** the dashboard recalculates and displays metrics for the last 7 days only

### Requirement: Time-Series Usage Chart

The dashboard SHALL render a time-series chart showing daily token consumption over the selected time period, with separate lines for prompt tokens and completion tokens.

#### Scenario: Daily token chart renders
- **WHEN** a manager views the dashboard
- **THEN** a recharts line chart displays with x-axis as dates and y-axis as token counts, showing prompt and completion tokens as separate series

#### Scenario: Chart with no data
- **WHEN** the team has no usage in the selected period
- **THEN** the chart displays an empty state message "No usage data for this period"

### Requirement: Per-Model Cost Distribution

The dashboard SHALL display a breakdown of cost by model (pie chart or bar chart), showing which models consume the most spend.

#### Scenario: Model cost distribution renders
- **WHEN** a manager views the dashboard
- **THEN** a recharts pie chart displays cost proportion per model, with model names as labels and cost as values

### Requirement: Per-Provider Volume Chart

The dashboard SHALL display a bar chart showing total token volume per provider, enabling managers to see which providers serve the most traffic.

#### Scenario: Provider volume chart renders
- **WHEN** a manager views the dashboard
- **THEN** a recharts bar chart displays token volume grouped by provider name

### Requirement: Per-Developer Breakdown Table

The dashboard SHALL include a sortable table listing each developer with their total tokens, total cost, request count, and last active timestamp for the selected period.

#### Scenario: Manager sorts by cost
- **WHEN** a manager clicks the "Cost" column header in the developer table
- **THEN** the table sorts developers by cost in descending order

#### Scenario: Developer table with no developers
- **WHEN** the team has developers but no usage in the selected period
- **THEN** the table shows all developers with zero values for tokens, cost, and requests

### Requirement: Usage Data API

The dashboard SHALL fetch usage data from a dedicated API endpoint that returns aggregated and per-developer usage statistics for the authenticated manager's team.

#### Scenario: Dashboard fetches usage API
- **WHEN** the dashboard page loads
- **THEN** it sends GET `/api/usage/dashboard?period=this_month` and renders data from the response

#### Scenario: Developer attempts dashboard API
- **WHEN** a developer sends GET `/api/usage/dashboard`
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: Export Capability

Managers SHALL be able to export usage data as CSV for the selected time period.

#### Scenario: Manager exports CSV
- **WHEN** a manager clicks "Export CSV" on the dashboard
- **THEN** the system generates a CSV file with columns: date, developer, model, provider, prompt_tokens, completion_tokens, cost and triggers a download

### Requirement: Real-Time Aggregate Refresh

The dashboard SHALL display a "Last updated" timestamp and SHALL provide a manual refresh button. Auto-refresh SHALL poll every 60 seconds while the page is open.

#### Scenario: Manual refresh
- **WHEN** a manager clicks the refresh button
- **THEN** the dashboard re-fetches usage data and updates all charts and tables

#### Scenario: Auto-refresh
- **WHEN** the dashboard page has been open for more than 60 seconds
- **THEN** the system automatically re-fetches usage data and updates displays
