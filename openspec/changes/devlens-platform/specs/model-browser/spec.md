## ADDED Requirements

### Requirement: Model Listing

The model browser SHALL display all available AI models grouped by provider. Each model SHALL show its name, provider, and pricing information (input/output token costs).

#### Scenario: Developer views model browser
- **WHEN** a developer navigates to the model browser page
- **THEN** the system displays models grouped by provider with model name and pricing per token

#### Scenario: Model browser with empty state
- **WHEN** no models are configured for the team
- **THEN** the system displays "No models configured yet. Contact your manager."

### Requirement: Combo Visualization

The model browser SHALL display available model combos with their sequence of models. Each combo SHALL show its name and the ordered list of models it will try in fallback order.

#### Scenario: Developer views a combo
- **WHEN** a developer expands a combo in the model browser
- **THEN** the system displays the ordered list of models with provider badges and fallback numbering

### Requirement: Model Search and Filter

The model browser SHALL allow developers to search models by name and filter by provider. Search SHALL be case-insensitive substring matching.

#### Scenario: Developer searches for a model
- **WHEN** a developer types "claude" in the search bar
- **THEN** the system filters the model list to show only models whose name contains "claude" (case-insensitive)

#### Scenario: Developer filters by provider
- **WHEN** a developer selects "Anthropic" from the provider filter dropdown
- **THEN** the system shows only models from the Anthropic provider

### Requirement: Model Capability Display

Each model entry SHALL display capability badges indicating supported features such as "Chat", "Vision", "Tool Use", "Streaming", and context window size.

#### Scenario: Model with vision support
- **WHEN** a model supports image input
- **THEN** the model card displays a "Vision" badge

#### Scenario: Model context window
- **WHEN** a model entry is displayed
- **THEN** the model card shows the context window size (e.g., "200K tokens")

### Requirement: API Endpoint Information

The model browser page SHALL prominently display the developer's API base URL and a quick-copy button for convenience.

#### Scenario: Developer copies API base URL
- **WHEN** a developer clicks the copy button next to the API base URL
- **THEN** the URL is copied to clipboard and a "Copied!" confirmation appears

### Requirement: Pricing Display

Each model SHALL display its input and output price per million tokens. If pricing is not configured, the display SHALL show "Contact manager for pricing".

#### Scenario: Model with configured pricing
- **WHEN** a model has pricing configured
- **THEN** the model card shows "$X.XX / 1M input tokens" and "$X.XX / 1M output tokens"

#### Scenario: Model without pricing
- **WHEN** a model has no pricing configuration
- **THEN** the model card shows "Contact manager for pricing"

### Requirement: Read-Only Guarantee

The model browser SHALL be read-only. No create, update, or delete operations on models, combos, providers, or pricing SHALL be available to developers through this interface.

#### Scenario: No edit buttons visible
- **WHEN** a developer views the model browser
- **THEN** no create, edit, or delete buttons are rendered for models, combos, or providers

#### Scenario: Direct API call attempt
- **WHEN** a developer sends PUT `/api/models/alias` directly
- **THEN** the system returns HTTP 403 Forbidden

### Requirement: Provider Status Indicators

The model browser SHALL display status indicators for each provider showing whether it is online, has active connections, or is unavailable.

#### Scenario: Provider with active connections
- **WHEN** a provider has at least one tested connection with status "ok"
- **THEN** the provider group header displays a green "Online" indicator

#### Scenario: Provider with all failed connections
- **WHEN** all connections for a provider have test status "error"
- **THEN** the provider group header displays a red "Unavailable" indicator
