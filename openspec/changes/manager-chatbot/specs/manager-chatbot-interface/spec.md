## ADDED Requirements

### Requirement: Manager-only page access
The chatbot page at `/dashboard/chatbot` SHALL be accessible only to users with the manager role.

#### Scenario: Manager accesses page
- **WHEN** a manager navigates to `/dashboard/chatbot`
- **THEN** the chat interface SHALL load with model selector and message input

#### Scenario: Developer accesses page
- **WHEN** a developer navigates to `/dashboard/chatbot`
- **THEN** the page SHALL display an access-denied message stating only managers can use the chatbot

### Requirement: Streaming chat display
The chat interface SHALL display messages in a scrollable conversation view with user messages right-aligned and assistant messages left-aligned, including typing indicators during streaming.

#### Scenario: User sends a message
- **WHEN** the user types "Show me this week's usage" and presses Send
- **THEN** the user message SHALL appear right-aligned immediately, and the assistant response SHALL stream in with a typing indicator

#### Scenario: Auto-scroll on new messages
- **WHEN** new messages or streaming content is added
- **THEN** the chat view SHALL auto-scroll to the bottom

### Requirement: Tool call rendering in chat
When the AI invokes a tool, the chat interface SHALL display a collapsible tool call card showing the tool name, arguments (formatted), and result, distinct from regular assistant text.

#### Scenario: Tool call card appears
- **WHEN** the AI calls the "get_usage" tool with `{ days: 7 }`
- **THEN** a card SHALL appear showing "Using tool: get_usage" with a loading spinner, then update to show "get_usage complete" with the result in a formatted block

#### Scenario: Tool call card collapsed
- **WHEN** a tool call card is rendered
- **THEN** the card SHALL be collapsed by default showing only the tool name and status (success/error), with a toggle to expand and see full arguments and result

#### Scenario: Tool call error card
- **WHEN** a tool execution fails with an error
- **THEN** the card SHALL show an error state (red indicator) with the error message visible

### Requirement: Model selector
The chat interface SHALL include a model selector dropdown populated from the team's combos list, filtered to tool-capable models.

#### Scenario: Team has multiple combos
- **WHEN** the team has combos "production", "fallback", and "cheap"
- **THEN** the model selector SHALL show all three combos as options

#### Scenario: Team has no combos
- **WHEN** the team has no combos configured
- **THEN** the model selector SHALL show individual tool-capable models from provider connections as fallback

#### Scenario: No tool-capable models
- **WHEN** no available models support tool/function calling
- **THEN** the chat SHALL display a warning: "No tool-capable models available. Chat functionality is limited."

### Requirement: Chat history persistence
The chat interface SHALL load the team's previous conversation history on page load and persist new messages (including tool calls) to the server.

#### Scenario: Returning manager sees history
- **WHEN** a manager who previously chatted opens the page
- **THEN** the previous conversation SHALL be loaded and displayed

#### Scenario: Message saved to history
- **WHEN** an assistant responds to a user message
- **THEN** both the user message and assistant response (with any tool calls) SHALL be saved to the database

### Requirement: Clear chat
The chat interface SHALL provide a "Clear chat" action that deletes the team's conversation history and resets the chat view.

#### Scenario: Manager clears chat
- **WHEN** the manager clicks "Clear chat" and confirms
- **THEN** all messages SHALL be deleted and the chat view SHALL reset to empty

### Requirement: Error handling in UI
The chat interface SHALL display errors (authentication failures, network errors, tool execution errors) as dismissible inline notifications without breaking the chat view.

#### Scenario: API returns error
- **WHEN** the chat API returns a 500 error
- **THEN** an error notification SHALL appear above the chat input and the last user message SHALL remain

#### Scenario: Network failure
- **WHEN** the fetch request fails due to network error
- **THEN** the UI SHALL show "Connection failed. Check your network and try again." with a retry button

### Requirement: Chat input
The chat interface SHALL provide a text input with a Send button, supporting Enter to send and Shift+Enter for newlines.

#### Scenario: Send via button
- **WHEN** the user types a message and clicks Send
- **THEN** the message SHALL be sent and the input SHALL clear

#### Scenario: Send via Enter key
- **WHEN** the user types a message and presses Enter (without Shift)
- **THEN** the message SHALL be sent

#### Scenario: Newline via Shift+Enter
- **WHEN** the user presses Shift+Enter
- **THEN** a newline SHALL be inserted without sending

#### Scenario: Empty input blocked
- **WHEN** the input is empty or only whitespace
- **THEN** the Send button SHALL be disabled
