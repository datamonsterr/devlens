## Why

Managers need quick, conversational access to Devlens platform operations (usage queries, provider status, team oversight) without navigating multiple dashboard pages. Current chatbot is a generic external proxy — no awareness of Devlens data, no tool-calling, no platform integration. Building an internal assistant with tool access gives managers a single conversational interface for platform-wide actions.

## What Changes

- Replace the current chatbot page at `/dashboard/chatbot` with a new **Manager Chatbot** that uses Devlens's own provider connections (not a separate external API config)
- Add a **tool-calling framework** in `src/chatbot/` that intercepts model tool-call requests and executes them against Devlens internal APIs/data
- Add a **skills module system** at `src/chatbot/skills/` where each skill defines a set of related tools with their schemas and executors
- Add a **structured system prompt** that instructs the AI about its manager-assistant persona, available tools, and response behavior
- Stream responses via SSE with inline tool-call rendering (show tool invocation + result in chat UI)
- Remove the old external chatbot config (API key, URL, model) — replaced by provider-based model selection
- Preserve chat history in local DB, now with tool-call message types

## Capabilities

### New Capabilities

- `manager-chatbot-tools`: Core tool-calling framework — tool schema registry, tool execution engine, tool result formatting. Enables AI model to call Devlens operations as tools (query usage, list providers, check team members, view combos, etc.)
- `manager-chatbot-skills`: Skills module system in `src/chatbot/skills/` — each skill is a self-contained folder with tool definitions, executors, and optional UI hints. Skills are auto-discovered and registered into the tool registry at server start.
- `manager-chatbot-prompt`: Structured system prompt — defines the assistant persona (Devlens Manager Assistant), tool usage guidelines, response tone, and scope boundaries. Stored as a packaged resource, not user-configurable.
- `manager-chatbot-interface`: Chatbot UI page — streaming chat interface with tool-call cards (show tool name, args, result inline), model selector from team providers, and conversation history. Manager-only access.

### Modified Capabilities

<!-- None — no existing chatbot spec exists to modify -->

## Impact

- **New package**: `src/chatbot/` — tool engine, skill registry, prompt loader, chat handler
- **Modified pages**: `src/app/(dashboard)/dashboard/chatbot/page.js` — replace with new manager chatbot UI
- **Modified API routes**: `src/app/api/chatbot/` — replace external proxy with internal tool-calling chat endpoint
- **New API routes**: `src/app/api/chatbot/tools/` — optional tool list/describe endpoint
- **Removed**: Old external chatbot config fields (apiKey, url from chatbot config table)
- **Dependencies**: No new npm packages required — tool-calling is function calls within the SSE handler, not a separate framework
- **Auth**: Manager-only access via existing `assertManager()` / `RoleGuard`
