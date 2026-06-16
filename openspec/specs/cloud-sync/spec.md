# cloud-sync Specification

## Purpose

Defines authentication, per-user data isolation, and token lifecycle management for syncing the vocab bank to Supabase via Google OAuth — both in the Chrome extension and the web app.

## Requirements

### Requirement: Google OAuth sign-in in Chrome extension

The extension SHALL NOT run Google OAuth itself. Instead, every extension sign-in surface SHALL initiate sign-in by opening a new browser tab at the deployed web app's login route with an extension marker (`<web app>/login?ext=1`), where the web app performs the full-page Google OAuth flow. Sign-in SHALL be reachable from two surfaces: the toolbar popup and the in-page definition popup. The extension SHALL become signed in only via the session handoff from the web app (see "Session handoff from web app to extension"), never through an in-extension OAuth call.

#### Scenario: Sign in from toolbar popup

- **WHEN** user clicks "Sign in with Google" in the toolbar popup while signed out
- **THEN** the extension SHALL open a new tab at `<web app>/login?ext=1`
- **THEN** the extension SHALL NOT call `chrome.identity.launchWebAuthFlow` or `signInWithIdToken`
- **THEN** the toolbar popup SHALL render its signed-in state the next time it is opened after the session has been handed back

#### Scenario: Sign in from in-page definition popup

- **WHEN** user clicks "Sign in with Google" in the in-page definition popup while signed out
- **THEN** the extension SHALL open a new tab at `<web app>/login?ext=1`
- **THEN** once the session is handed back, the in-page definition popup SHALL replace the sign-in button with "Save to Vocab Bank" without requiring a manual refresh

#### Scenario: Sign in with already-consented Google account

- **WHEN** user initiates sign-in from any surface and is already signed into the web app
- **THEN** the web app SHALL hand the existing session back to the extension without prompting Google for consent again

#### Scenario: Sign-in failure

- **WHEN** the Google OAuth flow fails or the user cancels on the web app
- **THEN** the extension SHALL remain signed out and SHALL NOT receive a session, while the failure is surfaced in the web app tab


<!-- @trace
source: extension-auth-web-app-oauth
updated: 2026-06-16
code:
  - packages/shared/package.json
  - packages/raycast/src/lib/auth.ts
  - packages/raycast/src/add-vocab.tsx
  - package.json
  - packages/raycast/assets/extension-icon.png
  - packages/shared/vitest.config.ts
  - packages/raycast/src/lib/vocab.ts
  - packages/raycast/src/lib/supabase.ts
  - packages/web/src/pages/VocabPage.tsx
  - packages/shared/src/encounters.ts
  - packages/extension/lib/dictionary-service.ts
  - packages/raycast/package.json
  - packages/raycast/raycast-env.d.ts
  - packages/raycast/tsconfig.json
  - dictionary-extension-prd.md
  - packages/shared/src/index.ts
  - raycast-add-vocab-prd.md
  - packages/shared/src/dictionary.ts
tests:
  - packages/shared/src/__tests__/dictionary.test.ts
  - packages/shared/src/__tests__/encounters.test.ts
-->

---
### Requirement: Sign out from Chrome extension

The extension SHALL allow the user to sign out from the toolbar popup, clearing the extension's Supabase session. Sign-out SHALL also be triggerable remotely by the web app: when the web app signs out, the extension SHALL clear its session in response to the web app's sign-out broadcast. Extension sign-out SHALL NOT depend on `chrome.identity` cached tokens.

#### Scenario: Sign out from the extension toolbar

- **WHEN** user clicks "Sign out" in the toolbar popup
- **THEN** the extension's Supabase session SHALL be cleared
- **THEN** the toolbar popup SHALL re-render in the signed-out state

#### Scenario: Web app sign-out cascades to the extension

- **WHEN** the user signs out of the web app while the extension holds a session
- **THEN** the web app SHALL broadcast a sign-out signal that the extension bridge receives
- **THEN** the extension SHALL clear its Supabase session


<!-- @trace
source: extension-auth-web-app-oauth
updated: 2026-06-16
code:
  - packages/shared/package.json
  - packages/raycast/src/lib/auth.ts
  - packages/raycast/src/add-vocab.tsx
  - package.json
  - packages/raycast/assets/extension-icon.png
  - packages/shared/vitest.config.ts
  - packages/raycast/src/lib/vocab.ts
  - packages/raycast/src/lib/supabase.ts
  - packages/web/src/pages/VocabPage.tsx
  - packages/shared/src/encounters.ts
  - packages/extension/lib/dictionary-service.ts
  - packages/raycast/package.json
  - packages/raycast/raycast-env.d.ts
  - packages/raycast/tsconfig.json
  - dictionary-extension-prd.md
  - packages/shared/src/index.ts
  - raycast-add-vocab-prd.md
  - packages/shared/src/dictionary.ts
tests:
  - packages/shared/src/__tests__/dictionary.test.ts
  - packages/shared/src/__tests__/encounters.test.ts
-->

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

---
### Requirement: Session handoff from web app to extension

The extension SHALL receive its authenticated session from the deployed web app via an explicit in-browser `postMessage` handshake, so the session token never travels over the network or in a URL. The web app SHALL broadcast its session to the page via `window.postMessage` only on genuine authentication transitions, and a dedicated extension bridge — a content script scoped exclusively to the web app origins — SHALL validate inbound messages before persisting the session with `supabase.auth.setSession()`.

The web app SHALL broadcast the session on `SIGNED_IN` and broadcast a clear on `SIGNED_OUT`, plus a one-time manual broadcast when an already-signed-in user arrives via the extension marker. The web app SHALL NOT broadcast on passive load (`INITIAL_SESSION`) or on `TOKEN_REFRESHED`. Once a session is handed back, the extension's Supabase client SHALL refresh its own tokens via `autoRefreshToken` without further broadcasts.

The bridge SHALL honor a session message only when the message origin is in the hardcoded allowlist (`https://dictionary-extension.vercel.app`, `http://localhost` on any port), the message source is the page's own `window`, and the message shape matches the agreed handoff contract; otherwise it SHALL be silently ignored.

#### Scenario: Session is handed back after web app sign-in

- **WHEN** the web app establishes a session (`SIGNED_IN`) and broadcasts `{ type: 'dict-ext-session', session }`
- **THEN** the bridge SHALL validate the origin, source, and shape, then call `setSession` to persist the session into `chrome.storage.local`
- **THEN** the extension SHALL be signed in

#### Scenario: Already-signed-in user handed back without re-consent

- **WHEN** an already-signed-in user opens `<web app>/login?ext=1`
- **THEN** the web app SHALL broadcast its existing session once and redirect to `/vocab`
- **THEN** the bridge SHALL persist the session and the extension SHALL become signed in

#### Scenario: Malicious origin is ignored

- **WHEN** a page on any origin other than the allowlisted ones posts a `{ type: 'dict-ext-session', session }` message
- **THEN** the bridge SHALL ignore it and SHALL NOT write any session

##### Example: handoff message trust decision

| message origin | source === window | type | shape valid | accepted |
| -------------- | ----------------- | ---- | ----------- | -------- |
| https://dictionary-extension.vercel.app | yes | dict-ext-session | yes | yes |
| http://localhost:5174 | yes | dict-ext-session | yes | yes |
| https://evil.com | yes | dict-ext-session | yes | no |
| https://dictionary-extension.vercel.app | no | dict-ext-session | yes | no |
| https://dictionary-extension.vercel.app | yes | other | yes | no |
| https://dictionary-extension.vercel.app | yes | dict-ext-session | no | no |

#### Scenario: Background token refresh does not resurrect a signed-out extension

- **WHEN** the user has signed the extension out and an open web app tab later fires `TOKEN_REFRESHED`
- **THEN** the web app SHALL NOT broadcast the refreshed session
- **THEN** the extension SHALL remain signed out

#### Scenario: In-page Save appears reactively when the session syncs in

- **WHEN** the session is persisted into `chrome.storage.local` while an in-page definition popup is open on a reading tab
- **THEN** a `chrome.storage.onChanged` listener SHALL flip the popup to its signed-in state and reveal the Save button without a manual refresh

<!-- @trace
source: extension-auth-web-app-oauth
updated: 2026-06-16
code:
  - packages/shared/package.json
  - packages/raycast/src/lib/auth.ts
  - packages/raycast/src/add-vocab.tsx
  - package.json
  - packages/raycast/assets/extension-icon.png
  - packages/shared/vitest.config.ts
  - packages/raycast/src/lib/vocab.ts
  - packages/raycast/src/lib/supabase.ts
  - packages/web/src/pages/VocabPage.tsx
  - packages/shared/src/encounters.ts
  - packages/extension/lib/dictionary-service.ts
  - packages/raycast/package.json
  - packages/raycast/raycast-env.d.ts
  - packages/raycast/tsconfig.json
  - dictionary-extension-prd.md
  - packages/shared/src/index.ts
  - raycast-add-vocab-prd.md
  - packages/shared/src/dictionary.ts
tests:
  - packages/shared/src/__tests__/dictionary.test.ts
  - packages/shared/src/__tests__/encounters.test.ts
-->

---
### Requirement: Google sign-in in the Raycast extension

The Raycast extension SHALL authenticate the user as the same Supabase user used by the extension and web app, via Supabase Google OAuth driven through Raycast's PKCE OAuth client (`signInWithOAuth` to obtain the authorization URL, then `exchangeCodeForSession` on the returned code). The resulting Supabase session SHALL be persisted in Raycast secure storage behind a custom Supabase storage adapter.

#### Scenario: Successful Raycast sign-in establishes a session

- **WHEN** a signed-out user completes the Google OAuth flow from the Raycast extension
- **THEN** a Supabase session SHALL be established for that user and persisted in Raycast secure storage

#### Scenario: Saved word is scoped to the signed-in user

- **WHEN** a signed-in Raycast user saves a word
- **THEN** the `vocab_entries` row SHALL be written under that user's id and isolated by row-level security


<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->

---
### Requirement: Raycast session persistence and refresh

The Raycast extension SHALL reuse the persisted session across launches and SHALL refresh the session automatically when the access token expires. When the session is revoked or cannot be refreshed, the extension SHALL re-initiate the Google sign-in flow on the next Add Vocab use.

#### Scenario: Session persists across launches

- **WHEN** a previously signed-in user opens the Raycast extension again
- **THEN** the extension SHALL reuse the stored session without requiring a new sign-in

#### Scenario: Unrefreshable session triggers re-auth

- **WHEN** the stored session cannot be refreshed (revoked or expired beyond refresh)
- **THEN** the next Add Vocab use SHALL re-initiate the Google sign-in flow

<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->