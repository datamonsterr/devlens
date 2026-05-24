## 1. Locate Surfaces

- [ ] 1.1 Find top-right menu, dashboard navigation, settings routes, and shared action config definitions.
- [ ] 1.2 Identify all Donate, Remote, Changelog, Shutdown, legacy auth, CLI auto-config writer/checker, cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped settings references.
- [ ] 1.3 Confirm whether Remote maps to legacy remote behavior or documented `/dashboard/endpoint` Team endpoint behavior.

## 2. Remove Legacy Actions

- [ ] 2.1 Remove Donate action from visible UI action/menu config.
- [ ] 2.2 Remove Changelog action from visible UI action/menu config.
- [ ] 2.3 Remove Shutdown action from visible UI action/menu config.
- [ ] 2.4 Remove legacy Remote action while preserving documented `/dashboard/endpoint` access if applicable.

## 3. Remove Outdated Settings

- [ ] 3.1 Remove legacy password/JWT/auth token settings from visible settings UI.
- [ ] 3.2 Remove CLI auto-config writer/checker settings while preserving copyable CLI Config Snippets.
- [ ] 3.3 Remove cloud/device sync, Tailscale, Proxy Pool, and non-Team-scoped 9router settings from visible settings UI.
- [ ] 3.4 Remove now-unused UI components/config entries when safe without schema or auth behavior changes.

## 4. Verification

- [ ] 4.1 Add or update tests covering absence of removed menu actions and settings.
- [ ] 4.2 Verify documented routes still render: `/dashboard/cli-config`, `/dashboard/endpoint`, `/dashboard/console-log`, and main dashboard routes.
- [ ] 4.3 Run project lint, typecheck, and relevant tests from the implementation worktree.
