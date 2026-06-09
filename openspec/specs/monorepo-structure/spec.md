# monorepo-structure Specification

## Purpose

Defines the npm workspaces monorepo layout with three packages — `packages/extension`, `packages/shared`, and `packages/web` — and the shared package's exported surface that both the extension and web app consume.

## Requirements

### Requirement: npm workspaces monorepo root

The repository SHALL be structured as an npm workspaces monorepo with a root `package.json` that declares workspaces for `packages/extension`, `packages/shared`, and `packages/web`.

#### Scenario: Install all dependencies from root

- **WHEN** `npm install` is run from the repository root
- **THEN** all workspace packages SHALL have their dependencies installed

#### Scenario: Build all packages from root

- **WHEN** a build script is run from the repository root
- **THEN** all three workspace packages SHALL build without errors

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
