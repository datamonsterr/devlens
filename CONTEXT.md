# Devlens

Centralized B2B platform for provisioning and monitoring AI access across developer teams.

## Language

**Team**:
A Clerk Organization mapped 1:1 to a Devlens team. Owns provider connections, combos, pricing, settings, RTK pool, and usage data.
_Avoid_: Workspace, group, account

**Manager**:
Team admin who configures providers, combos, pricing, invites developers, sets RTK pool, and views usage analytics. Dashboard-only role — cannot use `/v1/*` API.
_Avoid_: Admin, owner

**Developer**:
Team member who creates API keys, browses models, views personal usage, and consumes the `/v1/*` API. Cannot modify provider configs or team settings.
_Avoid_: User, member

**API Key**:
Per-developer HMAC-hashed credential for `/v1/*` API access. Created once (plaintext shown only on creation), rotated, and revoked by the developer or manager.
_Avoid_: Token, secret

**Provider Connection**:
A configured upstream AI provider (OpenAI, Anthropic, etc.) with credentials, priority, and test status. Scoped to a team.
_Avoid_: Provider config, upstream

**Combo**:
An ordered sequence of models tried in fallback order. Named combo models resolve to the first available model/provider.
_Avoid_: Chain, pipeline

**RTK Pool**:
Team-level integer budget of token savings. Decremented atomically when RTK compresses tool results during streaming requests. Managed with additive top-up semantics and optional billing-cycle reset.
_Avoid_: Quota, balance

**Model Alias**:
A short name mapped to a specific model string, usable in CLI tools for convenience.
_Avoid_: Shorthand

**Pricing Override**:
Manager-defined per-model cost per token. Auto-fetched from provider APIs where available, manually overridable.
_Avoid_: Rate, price config

**CLI Config Snippet**:
Copyable environment-variable or JSON config block shown in the web UI for Claude Code, OpenCode, and Codex. Replaces the removed CLI auto-config tools.
_Avoid_: Setup script

## Example Dialogue

> **Dev**: "I need to use Claude through Devlens. Where's my API key?"
>
> **Manager**: "Go to the API Keys page, create a key named 'claude-cli'. Copy it — you won't see it again. Then in the CLI Config tab, grab the Claude Code snippet and paste it into your `~/.claude/settings.json`."
>
> **Dev**: "Got it. Which model should I use for code review?"
>
> **Manager**: "Check the Model Browser — I've set up a combo called 'code-review' that tries claude-sonnet-4 first, then falls back to gpt-4o. Pricing per model is listed so you can compare cost."
>
> **Dev**: "My API calls are returning fewer tokens than expected."
>
> **Manager**: "RTK is active — it compresses repetitive tool output before it reaches the AI. The pool has 200K tokens left. I'll top it up if usage spikes."
