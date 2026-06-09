## ADDED Requirements

### Requirement: Tool schema registry
The system SHALL maintain a runtime registry of all available tools, indexed by tool name, containing each tool's JSON Schema definition and handler function reference.

#### Scenario: Tool registered from skill
- **WHEN** a skill module exports a tool definition with `name`, `schema`, and `handler`
- **THEN** the tool SHALL be added to the registry and available for AI model invocation

#### Scenario: Duplicate tool name
- **WHEN** two skills register tools with the same `name`
- **THEN** the system SHALL emit a warning on startup and the last-registered tool SHALL take precedence

#### Scenario: Invalid tool schema
- **WHEN** a skill exports a tool with non-JSON-Schema-compliant `schema`
- **THEN** the system SHALL skip that tool and log an error at startup

### Requirement: Tool execution engine
The system SHALL provide an execution engine that invokes a tool by name with arguments, validates arguments against the tool's JSON Schema, and returns the result or error.

#### Scenario: Valid tool call
- **WHEN** the engine receives `{ name: "get_usage", arguments: { days: 7 } }` and schema allows `days` as optional integer
- **THEN** the engine SHALL validate arguments, invoke the handler function with args and team context, and return the handler's result

#### Scenario: Missing required argument
- **WHEN** the engine receives tool call with missing required arguments per the tool's JSON Schema
- **THEN** the engine SHALL return an error with the specific validation failure and NOT invoke the handler

#### Scenario: Tool not found
- **WHEN** the engine receives a tool call for a name not in the registry
- **THEN** the engine SHALL return an error: "Tool 'X' not found"

#### Scenario: Handler throws error
- **WHEN** a tool handler throws an exception during execution
- **THEN** the engine SHALL catch the error and return `{ error: <message> }` without crashing the request

### Requirement: Tool result formatting for AI consumption
The system SHALL format tool execution results as JSON-serializable values suitable for inclusion in AI conversation messages.

#### Scenario: String result
- **WHEN** a tool handler returns a string
- **THEN** the engine SHALL wrap it as `{ result: "<string>" }`

#### Scenario: Object result
- **WHEN** a tool handler returns a JavaScript object
- **THEN** the engine SHALL include the object directly as the result value

#### Scenario: Large result truncation
- **WHEN** a tool result exceeds 4000 tokens (estimated)
- **THEN** the engine SHALL truncate the result to 4000 tokens and append a truncation notice

### Requirement: Team context injection into tool calls
The system SHALL inject the current team's context (`teamId`, `teamName`) into every tool execution so tools can scope queries to the manager's team.

#### Scenario: Tool uses team context
- **WHEN** a manager from "Acme Corp" invokes "get_usage"
- **THEN** the tool handler SHALL receive `context.teamId` matching the manager's team and SHALL scope the query to that team only

#### Scenario: Missing team context
- **WHEN** a request is made without valid team authentication (no team context resolved)
- **THEN** the engine SHALL reject all tool calls with a 401 error

### Requirement: Tool-calling in SSE chat flow
The system SHALL intercept model `tool_calls` in the SSE stream, execute tools sequentially, and loop back to the model with tool results before sending the final assistant response to the client.

#### Scenario: Model requests one tool call
- **WHEN** the upstream model returns a `tool_calls` delta with a single tool
- **THEN** the handler SHALL pause the stream, execute the tool, append `{ role: "tool", tool_call_id, content }` to messages, send the updated messages to the model again, and stream the model's final response

#### Scenario: Model returns text only
- **WHEN** the upstream model returns a text delta with no tool_calls
- **THEN** the handler SHALL stream the text directly to the client without tool interception

#### Scenario: Tool execution fails
- **WHEN** a tool execution returns an error
- **THEN** the handler SHALL append a tool message with the error text and loop back to the model for correction or fallback response

#### Scenario: Max tool rounds reached
- **WHEN** the model has already executed the maximum number of tool rounds (default: 3)
- **THEN** the handler SHALL stop looping and send the model's current response as the final answer
