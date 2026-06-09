# cloud-sync Specification

## Purpose

Defines authentication, per-user data isolation, and token lifecycle management for syncing the vocab bank to Supabase via Google OAuth — both in the Chrome extension and the web app.

## Requirements

### Requirement: Google OAuth sign-in in Chrome extension

The extension SHALL authenticate the user via Google OAuth using `chrome.identity.getAuthToken()` and exchange the resulting token with Supabase Auth to establish a session.

#### Scenario: Sign in from vocab bank page

- **WHEN** user clicks "Sign in with Google" on the vocab bank page
- **THEN** the extension SHALL open a Google OAuth consent screen, obtain a token, and sign the user into Supabase
- **THEN** the vocab bank SHALL reload showing the user's email and a "Sign out" button

#### Scenario: Sign in with already-consented Google account

- **WHEN** user clicks "Sign in with Google" and has previously consented
- **THEN** sign-in SHALL complete silently without showing a browser popup

#### Scenario: Sign-in failure

- **WHEN** the Google OAuth flow fails or the user cancels
- **THEN** the extension SHALL remain signed out and display an error message

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
