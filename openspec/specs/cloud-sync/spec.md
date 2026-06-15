# cloud-sync Specification

## Purpose

Defines authentication, per-user data isolation, and token lifecycle management for syncing the vocab bank to Supabase via Google OAuth — both in the Chrome extension and the web app.

## Requirements

### Requirement: Google OAuth sign-in in Chrome extension

The extension SHALL authenticate the user via Google OAuth using `chrome.identity.launchWebAuthFlow()` to obtain an OIDC id_token, then exchange it with Supabase Auth via `signInWithIdToken` to establish a session. Sign-in SHALL be reachable from three surfaces: the toolbar popup, the in-page definition popup, and the Vocab Bank page.

#### Scenario: Sign in from toolbar popup

- **WHEN** user clicks "Sign in with Google" in the toolbar popup while signed out
- **THEN** the extension SHALL open the Google OAuth consent screen, obtain an id_token, and sign the user into Supabase
- **THEN** the toolbar popup SHALL re-render in its signed-in state

#### Scenario: Sign in from Vocab Bank page

- **WHEN** user clicks "Sign in with Google" on the Vocab Bank page while signed out
- **THEN** the extension SHALL complete the OAuth flow and sign the user into Supabase
- **THEN** the Vocab Bank page SHALL reload showing the user's email and a "Sign out" button

#### Scenario: Sign in from in-page definition popup

- **WHEN** user clicks "Sign in with Google" in the in-page definition popup while signed out
- **THEN** the content script SHALL delegate the OAuth flow to the background service worker, which completes sign-in into Supabase
- **THEN** the in-page definition popup SHALL re-check the session and replace the sign-in button with "Save to Vocab Bank"

#### Scenario: Sign in with already-consented Google account

- **WHEN** user initiates sign-in from any surface and has previously consented
- **THEN** sign-in SHALL complete without requiring the user to re-grant consent

#### Scenario: Sign-in failure

- **WHEN** the Google OAuth flow fails or the user cancels, from any surface
- **THEN** the extension SHALL remain signed out and SHALL display an error message on the surface that initiated sign-in


<!-- @trace
source: unified-login-gated-vocab-bank
updated: 2026-06-15
code:
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/background.ts
  - CLAUDE.md
  - packages/extension/lib/auth.ts
  - packages/extension/lib/components/DefinitionPopup.tsx
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - unified-vocab-bank-prd.md
  - packages/extension/entrypoints/popup/App.tsx
  - packages/extension/entrypoints/content.ts
tests:
  - packages/extension/lib/__tests__/auth.test.ts
  - packages/extension/lib/__tests__/vocab-storage.test.ts
-->

---
### Requirement: Sign out from Chrome extension

The extension SHALL allow the user to sign out, clearing both the Supabase session and the cached Google token.

#### Scenario: Sign out

- **WHEN** user clicks "Sign out"
- **THEN** the Supabase session SHALL be cleared
- **THEN** `chrome.identity.removeCachedAuthToken()` SHALL be called
- **THEN** the vocab bank SHALL reload in the signed-out state

---
### Requirement: Google OAuth sign-in in web app

The web app SHALL authenticate the user via Supabase Auth Google OAuth redirect flow.

#### Scenario: Sign in from login page

- **WHEN** user clicks "Sign in with Google" on the login page
- **THEN** the browser SHALL redirect to Google's OAuth consent screen
- **THEN** after consent, the browser SHALL redirect back to the web app with a session established

#### Scenario: Session persistence across page reloads

- **WHEN** user has an active session and refreshes the page
- **THEN** the user SHALL remain signed in without being redirected to the login page

#### Scenario: Unauthenticated access attempt

- **WHEN** an unauthenticated user navigates to `/vocab` or `/review`
- **THEN** the app SHALL redirect to `/login`

---
### Requirement: Per-user data isolation via Supabase RLS

All vocab data in Supabase SHALL be governed by Row Level Security so that each user can only read and write their own words.

#### Scenario: User can only access own words

- **WHEN** a signed-in user reads from `vocab_entries`
- **THEN** only rows where `user_id = auth.uid()` SHALL be returned

#### Scenario: User cannot read other users' words

- **WHEN** a user attempts to query vocab entries belonging to another user
- **THEN** the query SHALL return zero rows (RLS silently filters them out)

---
### Requirement: Expired token recovery in extension

The extension SHALL handle Google token expiry by retrying the sign-in flow automatically.

#### Scenario: Cached token is expired

- **WHEN** a Supabase operation fails with an auth error due to an expired Google token
- **THEN** the extension SHALL call `chrome.identity.removeCachedAuthToken()` and retry `getAuthToken({interactive: false})`
- **THEN** if the retry succeeds, the original operation SHALL be retried
- **THEN** if the retry fails, the extension SHALL surface a "Session expired, please sign in again" message

---
### Requirement: OAuth delegation via background service worker

Because content scripts do not have access to `chrome.identity`, the extension SHALL provide a background service worker that performs the Google OAuth flow on behalf of the in-page definition popup. The content script SHALL request sign-in by sending a runtime message; the worker SHALL run the OAuth flow and respond with success or failure.

#### Scenario: Content script requests sign-in

- **WHEN** the content script sends a `sign-in` runtime message to the background worker
- **THEN** the worker SHALL run `launchWebAuthFlow` and `signInWithIdToken`, and SHALL respond with a success result once a Supabase session is established

#### Scenario: Delegated sign-in fails

- **WHEN** the OAuth flow run by the background worker fails or is cancelled
- **THEN** the worker SHALL respond with a failure result and the session SHALL remain signed out

#### Scenario: Direct sign-in is not delegated

- **WHEN** sign-in is initiated from the toolbar popup or the Vocab Bank page (both extension pages with `chrome.identity` access)
- **THEN** the OAuth flow SHALL run in that page directly and SHALL NOT be routed through the background worker


<!-- @trace
source: unified-login-gated-vocab-bank
updated: 2026-06-15
code:
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/background.ts
  - CLAUDE.md
  - packages/extension/lib/auth.ts
  - packages/extension/lib/components/DefinitionPopup.tsx
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - unified-vocab-bank-prd.md
  - packages/extension/entrypoints/popup/App.tsx
  - packages/extension/entrypoints/content.ts
tests:
  - packages/extension/lib/__tests__/auth.test.ts
  - packages/extension/lib/__tests__/vocab-storage.test.ts
-->

---
### Requirement: Shared signed-in state check across surfaces

The extension SHALL determine signed-in state using a fast, network-free session read (Supabase `getSession`, backed by the existing `chrome.storage` session adapter). Every surface SHALL use this check to decide whether to render the signed-in or signed-out state.

#### Scenario: Session present

- **WHEN** any surface checks signed-in state and a valid Supabase session exists in storage
- **THEN** the check SHALL return signed-in without making a network request

#### Scenario: Session absent

- **WHEN** any surface checks signed-in state and no session exists in storage
- **THEN** the check SHALL return signed-out

<!-- @trace
source: unified-login-gated-vocab-bank
updated: 2026-06-15
code:
  - dictionary-extension-prd.md
  - packages/extension/entrypoints/background.ts
  - CLAUDE.md
  - packages/extension/lib/auth.ts
  - packages/extension/lib/components/DefinitionPopup.tsx
  - packages/extension/entrypoints/vocab-bank/App.tsx
  - unified-vocab-bank-prd.md
  - packages/extension/entrypoints/popup/App.tsx
  - packages/extension/entrypoints/content.ts
tests:
  - packages/extension/lib/__tests__/auth.test.ts
  - packages/extension/lib/__tests__/vocab-storage.test.ts
-->