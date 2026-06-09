## ADDED Requirements

### Requirement: Skill folder structure
The system SHALL support skills as folders under `src/chatbot/skills/<skill-name>/` where each folder contains an `index.js` that exports `{ name, description, tools }`.

#### Scenario: Valid skill module
- **WHEN** a skill folder contains `index.js` exporting `{ name: "usage", description: "Usage analytics tools", tools: [...] }`
- **THEN** the skill registry SHALL import and register all tools from that skill

#### Scenario: Missing index.js
- **WHEN** a skill folder exists but has no `index.js`
- **THEN** the skill registry SHALL skip that folder with a warning log

#### Scenario: Invalid export shape
- **WHEN** a skill's `index.js` exports without a `tools` array
- **THEN** the skill registry SHALL skip that skill and log an error

### Requirement: Skill auto-discovery at startup
The system SHALL scan `src/chatbot/skills/` at server startup, import each valid skill module, and register all tools into the tool registry.

#### Scenario: Startup with multiple skills
- **WHEN** the server starts and `src/chatbot/skills/` contains `usage/`, `providers/`, and `team/` folders, each with valid `index.js`
- **THEN** all tools from all three skills SHALL be registered and available

#### Scenario: Startup with empty skills directory
- **WHEN** the server starts and `src/chatbot/skills/` is empty
- **THEN** the server SHALL start successfully with an empty tool registry (no chatbot tools available)

#### Scenario: Skill folder with subdirectories
- **WHEN** a skill folder contains subdirectories beyond `index.js` (e.g., helpers, utils)
- **THEN** those subdirectories SHALL be ignored by the auto-discovery scanner; only `index.js` root exports are used

### Requirement: Tool definition schema within skills
Each tool within a skill's `tools` array SHALL provide `name` (unique string), `description` (human-readable string), `schema` (JSON Schema object for arguments), and `handler` (async function receiving `(args, context)` and returning a result).

#### Scenario: Complete tool definition
- **WHEN** a skill defines a tool with all required fields
- **THEN** the tool SHALL be registered and invocable by the AI model

#### Scenario: Missing handler
- **WHEN** a skill defines a tool without a `handler` function
- **THEN** the tool SHALL be skipped and an error logged

#### Scenario: Non-async handler
- **WHEN** a skill defines a tool with a synchronous handler
- **THEN** the handler SHALL be wrapped to return a Promise automatically

### Requirement: Built-in skills
The system SHALL ship with at least the following skills:
1. **Usage skill** (`src/chatbot/skills/usage/`): Tools for querying team token usage, cost, active developers, and time-series data
2. **Providers skill** (`src/chatbot/skills/providers/`): Tools for listing provider connections, checking status, viewing model availability
3. **Team skill** (`src/chatbot/skills/team/`): Tools for listing team members, viewing quotas, checking RTK pool balance

#### Scenario: Setup includes built-in skills
- **WHEN** a fresh deployment starts without custom skills
- **THEN** the three built-in skills SHALL be present and their tools available to the AI

### Requirement: Skill handler context
Every tool handler SHALL receive a `context` object containing `{ teamId, teamName, userId }` scoped to the authenticated manager's session.

#### Scenario: Handler scopes query to team
- **WHEN** a usage skill handler queries the database
- **THEN** the query SHALL filter by `context.teamId` and SHALL NOT access data from other teams

### Requirement: Skill documentation
Each skill's `index.js` SHALL export a `description` string suitable for inclusion in the AI system prompt's tool listing.

#### Scenario: Description in prompt
- **WHEN** the system prompt is generated
- **THEN** each registered skill's `description` SHALL appear in the prompt's tool listing section
