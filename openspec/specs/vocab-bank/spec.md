# vocab-bank Specification

## Purpose

TBD - created by archiving change 'dictionary-extension'. Update Purpose after archive.

## Requirements

### Requirement: Toolbar popup as auth gateway and status surface

The toolbar popup SHALL act as the primary auth gateway. When signed out it SHALL prompt the user to sign in. When signed in it SHALL show vocab-bank status and links to the deployed standalone web app. Clicking the toolbar icon SHALL continue to open this popup.

#### Scenario: Signed-out toolbar popup

- **WHEN** user opens the toolbar popup while signed out
- **THEN** a "Sign in with Google" button SHALL be displayed
- **THEN** clicking it SHALL run the OAuth flow in the popup and, on success, re-render the popup in its signed-in state

#### Scenario: Signed-in toolbar popup

- **WHEN** user opens the toolbar popup while signed in
- **THEN** the popup SHALL display the number of words in the vocab bank, a CTA to open the Vocab Bank, a CTA to open Review, and a "Sign out" control

#### Scenario: Open Vocab Bank from popup

- **WHEN** user clicks the "Open Vocab Bank" CTA in the signed-in toolbar popup
- **THEN** the deployed web app's `/vocab` page SHALL open in a new browser tab

#### Scenario: Open Review from popup

- **WHEN** user clicks the "Review" CTA in the signed-in toolbar popup
- **THEN** the deployed web app's `/review` page SHALL open in a new browser tab

#### Scenario: Sign out from popup

- **WHEN** user clicks "Sign out" in the toolbar popup
- **THEN** the Supabase session SHALL be cleared and the popup SHALL re-render in its signed-out state

<!-- @trace
source: deploy-standalone-vocab-bank
updated: 2026-06-15
code:
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - packages/extension/entrypoints/review/App.tsx
  - packages/extension/entrypoints/vocab-bank/index.html
  - packages/extension/entrypoints/vocab-bank/main.tsx
  - packages/extension/lib/web-app-url.ts
  - packages/extension/entrypoints/vocab-bank/style.css
  - packages/extension/lib/vocab-storage.ts
  - vercel.json
  - packages/extension/entrypoints/review/index.html
  - deploy-standalone-vocab-bank-prd.md
  - packages/extension/entrypoints/review/main.tsx
  - packages/extension/entrypoints/review/style.css
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/popup/App.tsx
tests:
  - packages/extension/lib/__tests__/web-app-url.test.ts
-->