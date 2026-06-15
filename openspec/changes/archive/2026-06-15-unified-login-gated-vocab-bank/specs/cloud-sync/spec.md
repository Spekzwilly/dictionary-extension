## MODIFIED Requirements

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

## ADDED Requirements

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

### Requirement: Shared signed-in state check across surfaces

The extension SHALL determine signed-in state using a fast, network-free session read (Supabase `getSession`, backed by the existing `chrome.storage` session adapter). Every surface SHALL use this check to decide whether to render the signed-in or signed-out state.

#### Scenario: Session present

- **WHEN** any surface checks signed-in state and a valid Supabase session exists in storage
- **THEN** the check SHALL return signed-in without making a network request

#### Scenario: Session absent

- **WHEN** any surface checks signed-in state and no session exists in storage
- **THEN** the check SHALL return signed-out
