## ADDED Requirements

### Requirement: Dead translation file deleted

The file `open-sse/translator/request/openai-to-kiro.old.js` SHALL be deleted. No file in the codebase SHALL import or require it.

#### Scenario: Old translation file removed
- **WHEN** a developer searches for `openai-to-kiro.old.js`
- **THEN** the file does not exist

### Requirement: disabledModelsDb shim consolidated

The file `src/lib/disabledModelsDb.js` SHALL be deleted. All 4 API route files that import from `@/lib/disabledModelsDb` SHALL instead import directly from `@/lib/db`.

#### Scenario: disabledModelsDb file removed
- **WHEN** a developer searches for `src/lib/disabledModelsDb.js`
- **THEN** the file does not exist

#### Scenario: Consumer routes import directly from db
- **WHEN** API routes that used `disabledModelsDb` are inspected
- **THEN** all disabled model function imports come from `@/lib/db`

### Requirement: usageDb shim consolidated

The file `src/lib/usageDb.js` SHALL be deleted. All 8 API route files that import from `@/lib/usageDb` SHALL instead import directly from `@/lib/db`.

#### Scenario: usageDb file removed
- **WHEN** a developer searches for `src/lib/usageDb.js`
- **THEN** the file does not exist

#### Scenario: Consumer routes import directly from db
- **WHEN** API routes that used `usageDb` are inspected
- **THEN** all usage function imports come from `@/lib/db`

### Requirement: requestDetailsDb shim consolidated

The file `src/lib/requestDetailsDb.js` SHALL be deleted. The 1 API route file that imports from `@/lib/requestDetailsDb` SHALL instead import directly from `@/lib/db`.

#### Scenario: requestDetailsDb file removed
- **WHEN** a developer searches for `src/lib/requestDetailsDb.js`
- **THEN** the file does not exist

#### Scenario: Consumer route imports directly from db
- **WHEN** the API route that used `requestDetailsDb` is inspected
- **THEN** all request detail function imports come from `@/lib/db`

### Requirement: No remaining imports reference deleted shims

After all changes, no file in the codebase SHALL import from `@/lib/disabledModelsDb`, `@/lib/usageDb`, or `@/lib/requestDetailsDb`.

#### Scenario: Grep finds zero references to deleted shims
- **WHEN** `grep -r "disabledModelsDb\|usageDb\|requestDetailsDb" src/` is run
- **THEN** no matches are found

### Requirement: Build passes after all changes

The full build (`npm run build`) SHALL succeed with no errors after all deletions and import consolidations are applied.

#### Scenario: Next.js build succeeds
- **WHEN** `npm run build` is executed after all changes
- **THEN** the build completes with exit code 0 and no import or module-not-found errors
