# High-level design

```mermaid
flowchart LR
  DeveloperClient[CLI or SDK] --> V1[/v1/* API]
  Browser[Dashboard] --> Dashboard[/dashboard + /api management]
  Dashboard --> Clerk[Clerk Session]
  Clerk --> TeamContext[Team Context]
  V1 --> ApiKey[API Key Auth]
  ApiKey --> TeamContext
  TeamContext --> SQLite[(SQLite)]
  TeamContext --> Router[open-sse router]
  Router --> Providers[Upstream Providers]
  Router --> Usage[Usage + RTK Accounting]
  Usage --> SQLite
```

## Flow

1. Manager creates Team through Clerk Organization.
2. Manager configures Provider Connections, Combos, Pricing Overrides, RTK Pool.
3. Developer creates API Key.
4. CLI calls `/v1/*` with API Key.
5. API Key resolves Team and Developer.
6. Router resolves Team-scoped resources.
7. Usage, cost, RTK savings persist with Team and Developer.
