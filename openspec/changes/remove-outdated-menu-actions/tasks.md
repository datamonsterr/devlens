## 1. Locate Surfaces

- [x] 1.1 Find top-right menu, dashboard navigation, settings routes, and shared action config definitions.
- [x] 1.2 Identify all Donate, Remote, Changelog, Shutdown, legacy auth, CLI auto-config writer/checker, cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped settings references.
- [x] 1.3 Confirm whether Remote maps to legacy remote behavior or documented `/dashboard/endpoint` Team endpoint behavior.

## 2. Remove Legacy Actions

- [x] 2.1 Remove Donate action from visible UI action/menu config.
- [x] 2.2 Remove Changelog action from visible UI action/menu config.
- [x] 2.3 Remove Shutdown action from visible UI action/menu config.
- [x] 2.4 Remove legacy Remote action while preserving documented `/dashboard/endpoint` access if applicable.

## 3. Remove Outdated Settings

- [x] 3.1 Remove legacy password/JWT/auth token settings from visible settings UI.
- [x] 3.2 Remove CLI auto-config writer/checker settings while preserving copyable CLI Config Snippets.
- [x] 3.3 Remove cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped 9router settings from visible settings UI.
- [x] 3.4 Remove now-unused UI components/config entries when safe without schema or auth behavior changes.

## 4. Verification

- [x] 4.1 Add or update tests covering absence of removed menu actions and settings.
- [x] 4.2 Verify documented routes still render: `/dashboard/cli-config`, `/dashboard/endpoint`, `/dashboard/console-log`, and main dashboard routes.
- [x] 4.3 Run project lint, typecheck, and relevant tests from the implementation worktree.
