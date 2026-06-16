# monorepo-structure Specification

## Purpose

Defines the npm workspaces monorepo layout with three packages — `packages/extension`, `packages/shared`, and `packages/web` — and the shared package's exported surface that both the extension and web app consume.

## Requirements

### Requirement: npm workspaces monorepo root

The repository SHALL be structured as an npm workspaces monorepo with a root `package.json` that declares workspaces for `packages/extension`, `packages/shared`, `packages/web`, and `packages/raycast`.

#### Scenario: Install all dependencies from root

- **WHEN** `npm install` is run from the repository root
- **THEN** all workspace packages SHALL have their dependencies installed

#### Scenario: Build all packages from root

- **WHEN** a build script is run from the repository root
- **THEN** all four workspace packages SHALL build without errors


<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->

---
### Requirement: Shared package exports VocabEntry type and review session logic

The `packages/shared` package (published as `@dictionary/shared`) SHALL export the canonical `VocabEntry` type (and its constituent types) and all review session functions previously located in the extension's `lib/` directory.

#### Scenario: Extension imports VocabEntry from shared

- **WHEN** `packages/extension` imports `VocabEntry` from `@dictionary/shared`
- **THEN** the type SHALL resolve correctly and `tsc` SHALL pass with no errors

#### Scenario: Web app imports review session from shared

- **WHEN** `packages/web` imports `createSession`, `rateCard`, `isSessionComplete` from `@dictionary/shared`
- **THEN** the functions SHALL resolve correctly and the web app SHALL compile without errors

#### Scenario: Shared package is independently buildable

- **WHEN** `tsc --noEmit` is run inside `packages/shared`
- **THEN** it SHALL complete with no type errors

---
### Requirement: Extension package is a workspace member

The Chrome extension code SHALL reside at `packages/extension/` and be declared as a workspace member. All existing extension behavior SHALL be preserved after the move.

#### Scenario: Extension builds after move

- **WHEN** `npm run build` is run inside `packages/extension`
- **THEN** the extension SHALL build successfully and produce a valid `chrome-mv3` output

#### Scenario: Existing extension imports updated to use shared package

- **WHEN** `packages/extension` source files reference `VocabEntry` or review session functions
- **THEN** the imports SHALL point to `@dictionary/shared`, not to local `lib/` paths for those types

---
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

<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->