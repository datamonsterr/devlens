## ADDED Requirements

### Requirement: System prompt template
The system SHALL define a structured system prompt template at `src/chatbot/prompt.js` that exports a function `buildPrompt(context)` returning the full system prompt string.

#### Scenario: Prompt includes team context
- **WHEN** `buildPrompt({ teamName: "Acme Corp", tools: [...], modelInfo: {...} })` is called
- **THEN** the returned prompt SHALL include the team name "Acme Corp" in the greeting or context section

#### Scenario: Prompt includes tool listing
- **WHEN** `buildPrompt` is called with a non-empty `tools` array
- **THEN** the returned prompt SHALL include a section listing each tool by name with its description and argument schema

#### Scenario: Prompt with no tools
- **WHEN** `buildPrompt` is called with an empty `tools` array
- **THEN** the returned prompt SHALL state that no platform tools are available and instruct the model to respond conversationally

### Requirement: Assistant persona definition
The system prompt SHALL define the assistant persona as a Devlens Manager Assistant with the following traits:
1. Name: "Devlens Assistant"
2. Role: Helps team managers monitor and manage their Devlens AI access platform
3. Tone: Professional, concise, data-driven
4. Scope: Only Devlens platform operations — no general-purpose Q&A

#### Scenario: Assistant introduces itself
- **WHEN** a user sends "Hello" as the first message
- **THEN** the assistant SHALL respond with a Devlens-focused greeting, introducing itself as the Manager Assistant and offering help with platform operations

#### Scenario: Off-topic question
- **WHEN** a user asks "What's the weather in Paris?"
- **THEN** the assistant SHALL politely decline, stating its scope is Devlens platform operations

### Requirement: Tool usage instructions
The system prompt SHALL instruct the model to use tools when the user's question involves platform data or operations, and SHALL provide explicit guidance on which tool to use for common queries.

#### Scenario: Usage query triggers tool
- **WHEN** a user asks "How many tokens did we use this week?"
- **THEN** the prompt SHALL guide the model to call the usage query tool before answering

#### Scenario: Simple greeting does not trigger tool
- **WHEN** a user says "Hi there"
- **THEN** the prompt SHALL instruct the model to respond conversationally without calling tools

### Requirement: Data presentation guidance
The system prompt SHALL instruct the model to summarize tool results in natural language with key metrics highlighted, rather than dumping raw JSON.

#### Scenario: Tool result summarized
- **WHEN** a tool returns `{ totalTokens: 150000, cost: 12.50, activeDevelopers: 8 }`
- **THEN** the assistant SHALL present it as: "Your team used 150K tokens this week, costing $12.50, across 8 active developers."

#### Scenario: Empty tool result
- **WHEN** a tool returns an empty result (no usage data)
- **THEN** the assistant SHALL communicate clearly that no data was found, rather than showing empty JSON

### Requirement: Prompt immutability at runtime
The system prompt SHALL be loaded from the source file at server startup and SHALL NOT be editable through the dashboard UI or API at runtime.

#### Scenario: Manager views prompt
- **WHEN** the manager opens the chatbot and clicks "View System Prompt"
- **THEN** the current system prompt text SHALL be displayed in a read-only view

#### Scenario: Prompt not in chatbot config API
- **WHEN** a PUT request to `/api/chatbot` includes a `systemPrompt` field
- **THEN** the field SHALL be ignored — the system prompt is source-controlled

### Requirement: Tool list dynamism
The system prompt's tool listing section SHALL be generated dynamically at request time based on the currently registered tools in the tool registry, not hardcoded in the prompt template.

#### Scenario: New tool appears in prompt
- **WHEN** a new skill with tools is added to `src/chatbot/skills/` and the server is restarted
- **THEN** the next chatbot request SHALL include the new tool in the system prompt's tool listing
