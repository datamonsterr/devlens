## 1. Navigation Audit

- [x] 1.1 Locate sidebar, top-right/account menu, logout, profile, settings, and Stop UI implementations.
- [x] 1.2 Identify tests or snapshots covering dashboard navigation/account controls.

## 2. Account Menu Implementation

- [x] 2.1 Add or update account menu to expose profile access, settings access, and logout for signed-in Managers and Developers.
- [x] 2.2 Ensure settings entry links to existing settings route without changing settings permissions or content.
- [x] 2.3 Consolidate duplicate profile/logout controls into the account menu if existing controls overlap.

## 3. Sidebar Cleanup

- [x] 3.1 Remove Stop button from sidebar, top-right menus, account menus, settings controls, and primary dashboard controls.
- [x] 3.2 Remove Settings as a standalone sidebar module while preserving account-menu access.
- [x] 3.3 Verify sidebar remains focused on documented Devlens capability navigation.

## 4. Verification

- [x] 4.1 Update or add tests for account menu actions and sidebar absence of Stop/standalone Settings.
- [x] 4.2 Run relevant UI tests for dashboard navigation.
- [ ] 4.3 Run project lint and typecheck commands.
