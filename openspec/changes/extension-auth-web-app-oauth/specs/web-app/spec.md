## MODIFIED Requirements

### Requirement: Login page with Google sign-in

The web app SHALL display a login page when the user is unauthenticated. The page SHALL offer a single "Sign in with Google" button that initiates the Supabase OAuth redirect flow. When the login page is opened from the extension (signalled by an `ext=1` query parameter), it SHALL auto-start the Google OAuth flow without requiring a second click, guarded so the auto-start fires at most once and never on the return leg of the redirect. If the user is already authenticated when the login page is opened with `ext=1`, the page SHALL skip OAuth, hand the existing session to the extension, and redirect to `/vocab`. The OAuth `redirectTo` SHALL target a clean route without `ext=1` so the return leg does not re-trigger auto-start.

#### Scenario: Unauthenticated user sees login page

- **WHEN** an unauthenticated user visits any route without the `ext=1` marker
- **THEN** the app SHALL redirect to `/login` and display the login page

#### Scenario: Sign-in button initiates OAuth

- **WHEN** user clicks "Sign in with Google"
- **THEN** the browser SHALL redirect to the Google OAuth consent screen

#### Scenario: Successful sign-in redirects to vocab bank

- **WHEN** Google OAuth completes successfully and the session is established
- **THEN** the app SHALL redirect to `/vocab`

#### Scenario: Extension-initiated login auto-starts OAuth

- **WHEN** a signed-out user opens `/login?ext=1`
- **THEN** the app SHALL auto-start `signInWithOAuth` once, sending the user straight to Google's consent screen with no intermediate click
- **THEN** `redirectTo` SHALL be a clean `/vocab` URL that does not carry `ext=1`

#### Scenario: Extension-initiated login while already signed in

- **WHEN** an already-authenticated user opens `/login?ext=1`
- **THEN** the app SHALL NOT start a new OAuth flow
- **THEN** the app SHALL hand the existing session to the extension and redirect to `/vocab`

#### Scenario: Return leg does not re-trigger auto-start

- **WHEN** the browser returns from Google's consent to the web app carrying an OAuth `code`/`access_token`
- **THEN** the app SHALL NOT re-fire `signInWithOAuth`, avoiding a redirect loop

##### Example: auto-start decision

| hasSession | ext=1 present | returning from OAuth | auto-start OAuth |
| ---------- | ------------- | -------------------- | ---------------- |
| no | yes | no | yes |
| yes | yes | no | no (hand back session, redirect) |
| no | no | no | no |
| no | yes | yes | no |
