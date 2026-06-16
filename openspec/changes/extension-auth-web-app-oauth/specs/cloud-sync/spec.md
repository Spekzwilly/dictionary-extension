## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Expired token recovery in extension

**Reason**: This requirement relied on `chrome.identity.getAuthToken` / `removeCachedAuthToken` retry logic, which is removed along with the extension's in-extension OAuth path.
**Migration**: Once a session is handed back from the web app, the extension's Supabase client keeps it alive via `autoRefreshToken`. If refresh fails, the user re-initiates sign-in, which reopens the web app login tab.

#### Scenario: Token refresh no longer uses chrome.identity

- **WHEN** the extension's handed-back session approaches expiry
- **THEN** the extension SHALL refresh it via the Supabase client's `autoRefreshToken` and SHALL NOT call `chrome.identity.getAuthToken` or `removeCachedAuthToken`

### Requirement: OAuth delegation via background service worker

**Reason**: The extension no longer runs OAuth, so the background service worker that delegated `launchWebAuthFlow` on behalf of the in-page popup is deleted; the extension ships with no background worker.
**Migration**: The in-page definition popup's Google button opens `<web app>/login?ext=1` directly (the same path as the toolbar popup), and the resulting session arrives via the session handoff bridge.

#### Scenario: No background worker performs OAuth

- **WHEN** the in-page definition popup requests sign-in
- **THEN** no background service worker SHALL handle it, and the popup SHALL open `<web app>/login?ext=1` instead
