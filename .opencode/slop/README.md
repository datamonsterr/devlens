# Slop System

Mistake recording and avoidance for AI agents working on Devlens.

## Concept

When agent makes a mistake, record it as "slop" so future agent sessions (and the one that erred) can learn. Slop is structured, layered, and discoverable.

## Layers

```
.opencode/slop/
  general/           ← Cross-cutting mistakes (conventions, patterns, tool misuse)
  features/          ← Feature-specific pitfalls
    clerk-auth/
    provider-connections/
    combos/
    ...
```

## Entry Format

Each slop entry is a markdown file named `NN-short-slug.md`.

```markdown
# [Title]

**Severity**: critical | common | rare
**Layer**: general | features/{name}
**Related**: [OPTIONAL] links to other slop entries

## What went wrong

Brief description of the mistake made.

## What should have happened

Correct behavior that should have occurred.

## Why it matters

Impact of getting this wrong.

## How to avoid

Concrete steps or checks to prevent recurrence.
```

## Usage

### Recording a mistake: `/slop`

```
/slop "Used npm install instead of pnpm install"
```

Agent creates slop entry in appropriate layer, following template.

### Reading before work

`slop-reader` agent auto-runs before implementation. Reads:
1. All `general/` entries
2. Relevant `features/{name}/` entries for the task

### Layers priority

- **general/**: Always loaded. Low effort wrongness that happens regardless of task.
- **features/{name}/**: Loaded when working on that feature area. Specific to module, API route pattern, or data model.
