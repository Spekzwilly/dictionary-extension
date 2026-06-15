## ADDED Requirements

### Requirement: Toolbar popup as auth gateway and status surface

The toolbar popup SHALL act as the primary auth gateway. When signed out it SHALL prompt the user to sign in. When signed in it SHALL show vocab-bank status and navigation. Clicking the toolbar icon SHALL continue to open this popup.

#### Scenario: Signed-out toolbar popup

- **WHEN** user opens the toolbar popup while signed out
- **THEN** a "Sign in with Google" button SHALL be displayed
- **THEN** clicking it SHALL run the OAuth flow in the popup and, on success, re-render the popup in its signed-in state

#### Scenario: Signed-in toolbar popup

- **WHEN** user opens the toolbar popup while signed in
- **THEN** the popup SHALL display the number of words in the vocab bank, a CTA to open the Vocab Bank page in a new tab, a CTA to open the Review page, and a "Sign out" control

#### Scenario: Open Vocab Bank from popup

- **WHEN** user clicks the "Open Vocab Bank" CTA in the signed-in toolbar popup
- **THEN** the Vocab Bank page SHALL open in a new browser tab

#### Scenario: Sign out from popup

- **WHEN** user clicks "Sign out" in the toolbar popup
- **THEN** the Supabase session SHALL be cleared and the popup SHALL re-render in its signed-out state

## MODIFIED Requirements

### Requirement: Display auth state and sign-in/sign-out controls

The Vocab Bank page SHALL display the user's authentication state and provide controls to sign in or sign out, including when the page is opened directly by URL while signed out.

#### Scenario: Signed-out state

- **WHEN** user opens the Vocab Bank page (including by direct URL) and is not signed in
- **THEN** a "Sign in with Google" button SHALL be displayed
- **THEN** clicking it SHALL run the OAuth flow in the page and, on success, load the word list from Supabase

#### Scenario: Signed-in state

- **WHEN** user opens the Vocab Bank page and is signed in
- **THEN** the user's Google account email SHALL be displayed along with a "Sign out" button

#### Scenario: Signing in updates the word list

- **WHEN** user signs in from the Vocab Bank page
- **THEN** the word list SHALL reload from Supabase after sign-in completes
