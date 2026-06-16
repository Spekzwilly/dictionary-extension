## ADDED Requirements

### Requirement: Google sign-in in the Raycast extension

The Raycast extension SHALL authenticate the user as the same Supabase user used by the extension and web app, via Supabase Google OAuth driven through Raycast's PKCE OAuth client (`signInWithOAuth` to obtain the authorization URL, then `exchangeCodeForSession` on the returned code). The resulting Supabase session SHALL be persisted in Raycast secure storage behind a custom Supabase storage adapter.

#### Scenario: Successful Raycast sign-in establishes a session

- **WHEN** a signed-out user completes the Google OAuth flow from the Raycast extension
- **THEN** a Supabase session SHALL be established for that user and persisted in Raycast secure storage

#### Scenario: Saved word is scoped to the signed-in user

- **WHEN** a signed-in Raycast user saves a word
- **THEN** the `vocab_entries` row SHALL be written under that user's id and isolated by row-level security

### Requirement: Raycast session persistence and refresh

The Raycast extension SHALL reuse the persisted session across launches and SHALL refresh the session automatically when the access token expires. When the session is revoked or cannot be refreshed, the extension SHALL re-initiate the Google sign-in flow on the next Add Vocab use.

#### Scenario: Session persists across launches

- **WHEN** a previously signed-in user opens the Raycast extension again
- **THEN** the extension SHALL reuse the stored session without requiring a new sign-in

#### Scenario: Unrefreshable session triggers re-auth

- **WHEN** the stored session cannot be refreshed (revoked or expired beyond refresh)
- **THEN** the next Add Vocab use SHALL re-initiate the Google sign-in flow
