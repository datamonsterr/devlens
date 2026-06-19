# Devlens Documentation

Centralized B2B platform for provisioning and monitoring AI access across developer teams.

## Actors (User Roles)

| Role | Description | Capabilities |
|------|-------------|-------------|
| **Manager** | Team admin | Configures providers/combos/pricing/RTK, invites developers, views team analytics. Dashboard-only — cannot use `/v1/*` API. |
| **Developer** | Team member | Creates API keys, browses models, views personal usage, consumes `/v1/*` API. Cannot modify team configs. |

See [role-based-access](./role-based-access/feature_spec.md) for full RBAC matrix.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22, Bun (optional) |
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Package Manager | pnpm 10 |
| Auth (Dashboard) | Clerk (Organizations → Teams) |
| Auth (API) | HMAC API Keys (`Authorization: Bearer <key>`) |
| Database | SQLite multi-driver (libSQL/Turso, bun:sqlite, better-sqlite3, node:sqlite, sql.js) |
| API Proxy | OpenAI-compatible `/v1/*` with provider translation via `open-sse/` engine |
| State | Zustand |
| Deploy | Vercel (production), Docker Compose (local), Cloudflare Pages (docs) |

## Agentic Framework

Devlens uses OpenCode as its AI agent harness with OpenSpec for spec-driven development.

### Agent Workflow

```
context → specs → worktree → implement → verify → sync specs
```

1. **Read context**: `CONTEXT.md`, `docs/README.md`, relevant feature specs
2. **Load mistakes**: `.opencode/slop/` to avoid known pitfalls
3. **Create worktree**: Isolated git worktree under `./worktrees/`
4. **Implement**: Follow OpenSpec tasks or direct instructions
5. **Verify**: `pnpm build`, `pnpm lint`, `pnpm test`
6. **Sync specs**: Update docs after behavior changes

### Key Agents

| Agent | File | Purpose |
|-------|------|---------|
| living-spec-reader | `.opencode/agents/living-spec-reader.md` | Reads relevant docs before work |
| living-spec-syncer | `.opencode/agents/living-spec-syncer.md` | Syncs docs after changes |
| slop-reader | `.opencode/agents/slop-reader.md` | Reads mistake log before work |
| slop-writer | `.opencode/agents/slop-writer.md` | Records mistakes when found |
| test-runner | `.opencode/agents/test-runner.md` | Runs vitest unit tests |
| test-writer | `.opencode/agents/test-writer.md` | Writes new unit tests |
| debugger | `.opencode/agents/debugger.md` | Debugs test failures |

### Key Commands

| Command | File | Purpose |
|---------|------|---------|
| `/opsx-propose` | `.opencode/commands/opsx-propose.md` | Propose new OpenSpec change |
| `/opsx-apply` | `.opencode/commands/opsx-apply.md` | Implement OpenSpec tasks |
| `/opsx-archive` | `.opencode/commands/opsx-archive.md` | Archive completed change |
| `/opsx-explore` | `.opencode/commands/opsx-explore.md` | Explore ideas before proposal |
| `/slop` | `.opencode/commands/slop.md` | Record a mistake for future avoidance |

### Slop/Mistake Management

When agent makes a mistake, use `/slop` to record it. Slop entries are layered:
- `general/` — cross-cutting mistakes (bad patterns, conventions)
- `features/{name}/` — feature-specific pitfalls

Agents read slop before starting work to avoid repeating mistakes.

See [.opencode/slop/](../.opencode/slop/README.md) for the slop system design.

## Documentation Map

### Feature Docs (per feature, read before implementation)

| Feature | Folder | Key Docs |
|---------|--------|----------|
| Clerk Auth | `clerk-auth/` | feature_spec, technical |
| CLI Config Snippets | `cli-config-snippets/` | feature_spec, technical |
| Combos | `combos/` | feature_spec, technical |
| Console Logs | `console-logs/` | feature_spec, technical |
| Developer API Keys | `developer-api-keys/` | feature_spec, technical |
| Model Browser | `model-browser/` | feature_spec, technical |
| Pricing Overrides | `pricing-overrides/` | feature_spec, technical |
| Provider Connections | `provider-connections/` | feature_spec, technical |
| Role-Based Access | `role-based-access/` | feature_spec, technical |
| RTK Pool | `rtk-pool/` | feature_spec, technical |
| Team Management | `team-management/` | feature_spec, technical |
| Team-Routed API Access | `team-routed-api-access/` | feature_spec, technical |
| Usage Analytics | `usage-analytics/` | feature_spec, technical |

### Cross-Cutting Technical Docs

| Doc | Purpose |
|-----|---------|
| [architecture.md](./architecture.md) | System architecture, component design, data flow |
| [database-schema.md](./database-schema.md) | Schema design, migrations, multi-driver setup |
| [api-route-map.md](./api-route-map.md) | Complete API route catalog |
| [auth-and-roles.md](./auth-and-roles.md) | Auth architecture, RBAC design |
| [sse-routing-core.md](./sse-routing-core.md) | Provider routing + SSE streaming engine |
| [pricing-model.md](./pricing-model.md) | Pricing concepts and storage |
| [v1-api-key-routing.md](./v1-api-key-routing.md) | API key auth flow for /v1/* |
| [local-dev-docker.md](./local-dev-docker.md) | Local dev and Docker setup |
| [testing.md](./testing.md) | Test strategy and coverage |
| [removal-plan.md](./removal-plan.md) | 9router→Devlens removal plan |
| [technical-decisions.md](./technical-decisions.md) | Accepted architecture decisions |
| [agent-workflow.md](./agent-workflow.md) | Agent workflow conventions |
| [high-level-design.md](./high-level-design.md) | HLD with data flow diagrams |
| [sqlite-to-turso.md](./sqlite-to-turso.md) | Operator runbook for Turso migration |

### Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [0001](./adr/0001-living-specs-as-source-of-truth.md) | Living specs as source of truth |

## How to Use

### Before implementing a feature
1. Read this README for orientation
2. Read `docs/{feature_name}/feature_spec.md` for requirements
3. Read `docs/{feature_name}/technical.md` for implementation constraints
4. Read relevant cross-cutting tech docs (architecture, auth, schema)
5. Load `.opencode/slop/` entries for the feature area

### After implementing
1. Update `docs/{feature_name}/feature_spec.md` if behavior changed
2. Update `docs/{feature_name}/technical.md` if architecture changed
3. Add ADR if decision was hard-to-reverse/trade-off
4. Record any discovered mistakes via `/slop`
5. Run `pnpm build && pnpm lint && pnpm test`

### Starting a new OpenSpec change
1. Use `/opsx-propose` command
2. Read existing OpenSpec changes in `openspec/changes/`
3. Read relevant feature specs
4. Follow agent workflow: context → specs → worktree → implement → verify → sync
