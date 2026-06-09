## 1. Module scaffolding

- [x] 1.1 Create `src/chatbot/` base directory with `index.js` barrel export
- [x] 1.2 Create `src/chatbot/skills/` directory for skill modules
- [x] 1.3 Create `src/chatbot/toolRegistry.js` with Registry class (register, get, list, clear)
- [x] 1.4 Create `src/chatbot/toolExecutor.js` with execute function (validate, invoke, format)
- [x] 1.5 Create `src/chatbot/skillRegistry.js` with filesystem auto-discovery scanner

## 2. Tool system

- [x] 2.1 Implement tool schema validation in `toolExecutor.js` using JSON Schema (ajv or manual validation)
- [x] 2.2 Implement argument coercion/defaults from JSON Schema definitions
- [x] 2.3 Implement result truncation for large tool outputs (>4000 tokens)
- [x] 2.4 Implement team context injection (`{ teamId, teamName, userId }`) into tool handlers
- [x] 2.5 Add error handling: tool-not-found, validation-failure, handler-throws → formatted error result

## 3. Built-in skills

- [x] 3.1 Create `src/chatbot/skills/usage/index.js` with tools: `get_team_usage_summary`, `get_usage_timeseries`, `get_usage_by_developer`
- [x] 3.2 Create `src/chatbot/skills/providers/index.js` with tools: `list_providers`, `check_provider_status`, `get_provider_models`
- [x] 3.3 Create `src/chatbot/skills/team/index.js` with tools: `list_team_members`, `get_rtk_pool_balance`, `get_api_key_counts`
- [x] 3.4 Wire skillRegistry to scan and import all built-in skills on server start

## 4. System prompt

- [x] 4.1 Create `src/chatbot/prompt.js` with `buildPrompt(context)` function
- [x] 4.2 Define assistant persona: Devlens Manager Assistant, platform-scoped, professional tone
- [x] 4.3 Include dynamic tool listing section generated from tool registry at request time
- [x] 4.4 Include tool usage guidance (when to call tools, how to summarize results)
- [x] 4.5 Include team context (team name, member count) in prompt
- [x] 4.6 Add `GET /api/chatbot/prompt` route for read-only prompt viewing in UI

## 5. Chat API endpoint

- [x] 5.1 Create `POST /api/chatbot/internal/chat` route with SSE streaming
- [x] 5.2 Implement request processing: load history, build prompt, select model/combo
- [x] 5.3 Implement SSE event types: `text_delta`, `tool_call`, `tool_result`, `done`, `error`
- [x] 5.4 Implement tool-call interception loop (max 3 rounds) in SSE handler
- [x] 5.5 Hook into existing provider execution layer (combo-aware) via `src/sse/`
- [x] 5.6 Guard route with `assertManager()` from `@/lib/auth`
- [x] 5.7 Remove or deprecate old `POST /api/chatbot/chat` route (external proxy)

## 6. Chat UI

- [x] 6.1 Replace `src/app/(dashboard)/dashboard/chatbot/page.js` with new Manager Chatbot page
- [x] 6.2 Create chat message display component with user/assistant/tool_call/tool_result rendering
- [x] 6.3 Create ToolCallCard component: collapsible, shows tool name + args + result, error state
- [x] 6.4 Create ModelSelector component populated from team combos (filtered to tool-capable)
- [x] 6.5 Implement SSE stream consumption in client with EventSource or fetch + ReadableStream
- [x] 6.6 Wire chat history: load on mount, save on each exchange (user + assistant + tools)
- [x] 6.7 Implement Clear Chat with confirmation dialog
- [x] 6.8 Implement Enter-to-send, Shift+Enter for newline, auto-scroll behavior
- [x] 6.9 Add "View System Prompt" button showing read-only prompt in modal
- [x] 6.10 Guard page with `RoleGuard` (manager-only)

## 7. History persistence

- [x] 7.1 Extend `chatbotHistoryRepo` to save `tool_call` and `tool_result` message types
- [x] 7.2 Update `GET /api/chatbot/history` to return tool call messages
- [x] 7.3 Update `DELETE /api/chatbot/history` to clear all message types

## 8. Cleanup & hardening

- [x] 8.1 Remove old chatbot config UI (API key, URL, model fields) from page
- [x] 8.2 Remove `systemPrompt` field handling from `PUT /api/chatbot` (now source-controlled)
- [x] 8.3 Add model capability filtering: only show tool-supporting models in selector
- [x] 8.4 Handle edge case: no tool-capable models available → warning state
- [x] 8.5 Verify all imports follow project conventions (alias paths `@/` where applicable)
- [x] 8.6 Run lint, typecheck, and build to verify no regressions

## 9. Verification

- [ ] 9.1 Manual test: Manager opens chatbot, sees greeting, queries usage with tool call
- [ ] 9.2 Manual test: Tool call renders as collapsible card with correct data
- [ ] 9.3 Manual test: Chat history persists across page reloads
- [ ] 9.4 Manual test: Clear chat removes all history
- [ ] 9.5 Manual test: Developer gets access-denied on chatbot page
- [ ] 9.6 Manual test: No tool-capable models shows warning
