# Use wrong domain terminology

**Severity**: common
**Layer**: general

## What went wrong

Agent used terms like "workspace", "user", "admin", "token", "quota", "shorthand", "rate", "setup script" instead of the project's domain language.

## What should have happened

Always use correct Devlens terms from `CONTEXT.md`:

| Use | Avoid |
|-----|-------|
| Team | Workspace, group, account |
| Manager | Admin, owner |
| Developer | User, member |
| API Key | Token, secret |
| Provider Connection | Provider config, upstream |
| Combo | Chain, pipeline |
| RTK Pool | Quota, balance |
| Model Alias | Shorthand |
| Pricing Override | Rate, price config |
| CLI Config Snippet | Setup script |

## Why it matters

Consistent language reduces confusion. AGENTS.md rule 23-25: "Use project language from CONTEXT.md." Specs, code, and docs must use same terms.

## How to avoid

- Read `CONTEXT.md` before any work
- Keep the avoidance table above visible during implementation
- Grep code for avoided terms and replace with correct ones
