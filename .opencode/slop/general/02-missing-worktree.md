# Skip worktree creation before implementation

**Severity**: critical
**Layer**: general

## What went wrong

Agent started modifying files directly in main worktree without creating an isolated git worktree first.

## What should have happened

Always follow the worktree workflow:
1. `git worktree add ./worktrees/<task-name> -b <task-branch>`
2. Copy `.env` from main worktree into new worktree
3. Work inside the new worktree directory
4. All file paths should use the worktree path: `./worktrees/<task-name>/...`

## Why it matters

AGENTS.md rule 2 requires worktree isolation. Without worktree:
- Changes pollute main working tree
- No branch isolation
- No safe rollback
- Risk of mixing unrelated changes

## How to avoid

- Read `AGENTS.md` rule 2 before any implementation
- Never create or edit files in `/home/dat/dev/devlens/` directly
- Always target `/home/dat/dev/devlens/worktrees/<task-name>/`
- Use `ls ./worktrees/` to verify worktree exists before starting
