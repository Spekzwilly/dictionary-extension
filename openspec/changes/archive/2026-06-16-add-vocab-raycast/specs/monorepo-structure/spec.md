## MODIFIED Requirements

### Requirement: npm workspaces monorepo root

The repository SHALL be structured as an npm workspaces monorepo with a root `package.json` that declares workspaces for `packages/extension`, `packages/shared`, `packages/web`, and `packages/raycast`.

#### Scenario: Install all dependencies from root

- **WHEN** `npm install` is run from the repository root
- **THEN** all workspace packages SHALL have their dependencies installed

#### Scenario: Build all packages from root

- **WHEN** a build script is run from the repository root
- **THEN** all four workspace packages SHALL build without errors

## ADDED Requirements

### Requirement: Shared package exports dictionary lookup and encounter merge logic

The `packages/shared` package (published as `@dictionary/shared`) SHALL export `lookupWord` (the dictionary lookup previously located in the extension) and a pure `mergeEncounters` helper that deduplicates encounters by timestamp and appends new ones, preserving existing order and never mutating its inputs. The shared package SHALL NOT take a `supabase-js` dependency; each consuming surface SHALL perform its own Supabase calls.

#### Scenario: Extension imports lookupWord from shared

- **WHEN** `packages/extension` references the dictionary lookup
- **THEN** the import SHALL resolve from `@dictionary/shared` and the extension test suite SHALL still pass

#### Scenario: Raycast imports lookup and merge from shared

- **WHEN** `packages/raycast` imports `lookupWord` and `mergeEncounters` from `@dictionary/shared`
- **THEN** both SHALL resolve correctly and `tsc` SHALL pass with no errors

#### Scenario: mergeEncounters deduplicates by timestamp

- **WHEN** `mergeEncounters` is called with existing and incoming encounter arrays
- **THEN** encounters sharing a `savedAt` with an existing one SHALL NOT be duplicated, new encounters SHALL be appended, existing order SHALL be preserved, and the input arrays SHALL NOT be mutated

##### Example: dedupe and append

- **GIVEN** existing: [{savedAt: 1}, {savedAt: 2}], incoming: [{savedAt: 2}, {savedAt: 3}]
- **WHEN** `mergeEncounters(existing, incoming)` is called
- **THEN** the result is [{savedAt: 1}, {savedAt: 2}, {savedAt: 3}]
