## Context

Devlens is a centralized B2B AI access platform (Next.js 16, Clerk auth, SQLite). The current chatbot page at `/dashboard/chatbot` is a generic external proxy — managers configure a separate API key/URL/model, send messages, and receive replies. It has no awareness of Devlens data, no ability to query usage or manage platform resources. Managers must navigate multiple dashboard pages for routine operations.

Meanwhile, Devlens already has provider connections, combos, usage tracking, team management APIs, and SSE streaming infrastructure. The platform is well-positioned to add an internal AI assistant that leverages these existing systems.

## Goals / Non-Goals

**Goals:**
- Replace the external-proxy chatbot with a Devlens-aware internal assistant
- Enable AI model to call Devlens operations as tools (usage queries, provider status, team oversight, etc.)
- Provide a modular skills system where new tools can be added as self-contained folders
- Use Devlens's own provider connections (combos + models) — no separate API key wiring
- Stream responses with tool-call result rendering inline in the chat UI
- Keep the structured system prompt as a packaged resource, versioned with code

**Non-Goals:**
- Developer-facing chatbot (manager-only)
- Autonomous agent that acts without user confirmation for destructive actions
- RAG/vector search over Devlens data
- Multi-turn autonomous tool loops — one tool round per user message
- External third-party tool integration (only Devlens internal operations)
- Replacing the existing Dashboard UI — chatbot is complementary, not a replacement

## Decisions

### 1. Tool-calling: Server-side execution in SSE handler

**Choice**: The SSE handler intercepts `tool_calls` in the stream, pauses the stream, executes each tool server-side, appends `tool` role messages to the conversation, and loops back to the model for final response.

**Why**: Server-side execution keeps DB access, auth context, and team-scoped queries in a single request lifecycle. No client→server roundtrips for each tool call. No tool schemas exposed to the browser.

**Alternatives considered**:
- Client-side execution: Would expose internal APIs to the browser. Requires CORS, auth token passing, and increases attack surface.
- LangChain/LangGraph dependency: Overkill for single-round tool execution. Adds weight and abstraction. Devlens already has provider execution/streaming in `src/sse/`.

### 2. Skills: Filesystem-based auto-discovery

**Choice**: `src/chatbot/skills/<skill-name>/` folders. Each folder has an `index.js` exporting `{ name, description, tools }` where each tool is `{ schema: JSON Schema, handler: async (args, context) => result }`. At server start, `src/chatbot/skillRegistry.js` scans the directory, imports each skill, and registers tools into a flat Map.

**Why**: New skills are just new folders — no central registry file to update. Follows Next.js conventions of filesystem routing (app directory, API routes). Simple module system with no runtime plugin overhead.

**Alternatives considered**:
- Central registry file: Requires editing a central file for each new skill, merge conflicts.
- Dynamic plugin loading: Overengineered for internal skills, adds plugin lifecycle complexity.
- npm packages for skills: Unnecessary indirection for internal Devlens operations.

### 3. Model selection: Combo-first via existing provider connections

**Choice**: The chatbot page shows a model selector populated from the team's combos list (from `combos` table). If combos exist, combos are shown. Fallback to individual models from provider connections. The selected combo/model is used for all chatbot requests.

**Why**: Combo fallback is a core Devlens feature. Managers already configure combos with priority ordering. Using combos means chatbot inherits existing reliability patterns (provider A fails → provider B). No new config.

**Alternatives considered**:
- Separate chatbot-specific model config: Creates a second place to manage models, diverges from Devlens model.
- Hardcoded model: Inflexible, doesn't leverage existing infrastructure.

### 4. Structured prompt: Packaged resource, not DB config

**Choice**: System prompt stored as a template file at `src/chatbot/prompt.md` or `src/chatbot/prompt.js` (exports a function that receives team context and returns the prompt string). Loaded at server start, cached. Manager can view in UI but not edit (prompt evolves with code).

**Why**: The prompt is a product behavior contract, not user configuration. Versioning with code ensures prompt changes are reviewed and tested. Template function allows dynamic injection of team name, available tools list, current model info.

**Alternatives considered**:
- DB-stored prompt: Managers could break the assistant with bad prompts. No version control.
- User-editable prompt: Conflicts with tool-calling behavior — model needs specific instructions to use tools correctly. Editable prompt could break tool calling.

### 5. Chat endpoint: New route, SSE streaming

**Choice**: New POST `/api/chatbot/internal/chat` endpoint. Accepts `{ messages, model/combo_id }`. Returns SSE stream with events: `text_delta`, `tool_call`, `tool_result`, `done`, `error`. The existing `/api/chatbot/chat` route (external proxy) is removed.

**Why**: Clean separation from old external-proxy approach. SSE is already proven in `/api/dashboard/chat/completions`. Event types allow UI to render tool calls differently from text.

**Alternatives considered**:
- Modify existing `/api/chatbot/chat`: Would complicate route with branching logic (external proxy vs internal tool-calling).
- WebSocket: SSE is simpler, fire-and-forget for one shot, no connection lifecycle management needed.

### 6. History: Extended message types

**Choice**: Extend `chatbotHistoryRepo` message schema to support: `user`, `assistant`, `tool_call` (stores tool name + args), `tool_result` (stores tool name + result). History is persisted per-team to SQLite `chatbot_history` table (already exists). Tool call/result messages are rendered as collapsible cards in the UI.

**Why**: Existing history table and repo already work. Adding message types is a schema extension, not a new system. Tool call history lets managers review what operations the assistant performed.

### 7. Auth: Existing manager guard

**Choice**: Page uses `RoleGuard` + `useRole()` (existing pattern). API route uses `assertManager()` from `@/lib/auth`. No new auth mechanism.

## Risks / Trade-offs

- **Tool hallucination**: AI may call non-existent tools or pass wrong args → Mitigation: Tool schemas use strict JSON Schema with `required` fields. Handler validates args before execution. Invalid calls return descriptive errors to model for self-correction.
- **SSE connection timeout during tool execution**: Long-running tools (e.g., large usage queries) could exceed browser timeout → Mitigation: Keep tool execution under 5s by limiting query range. Show "Working..." in UI. If a tool takes longer, execute async and notify on next message.
- **Prompt drift over time**: System prompt becomes outdated as new tools are added → Mitigation: Prompt template dynamically lists available tools by scanning the registry at load time. Tool descriptions are self-documenting.
- **Single-round limitation**: AI may want to chain multiple tool calls (call tool, inspect result, call another tool) → Mitigation: Limit to one round for v1. Future iterations can add multi-round via a loop counter (max 3 rounds).
- **Model tool-calling capability varies by provider**: Not all models support native tool/function calling → Mitigation: Show only tool-capable models in the selector. Filter by known tool-supporting providers (OpenAI, Anthropic, Gemini). Combo fallback only among tool-capable models.

## Migration Plan

1. Deploy change — old chatbot page replaced with new manager chatbot
2. Old chatbot config rows in `chatbot_config` table remain (no data migration) — unused
3. Old chat history remains in `chatbot_history` — compatible with new message types
4. No rollback needed — old chatbot was an isolated feature with no downstream dependencies

## Open Questions

- Should destructive tool calls (e.g., revoke API key, remove developer) require explicit user confirmation in chat before execution? Recommended: Yes, show confirmation card with "Execute" / "Cancel" buttons.
- Should chat history persist across sessions (per-team, stored in DB) or only per-session (localStorage)? Recommended: Per-team DB persistence using existing `chatbotHistoryRepo`.
- Should the chatbot be available outside the dashboard (e.g., a floating widget)? Recommended: Dashboard page only for v1.
