## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Display all saved words as a list

**Reason**: The extension's internal Vocab Bank page is retired; the deployed web app is now the single bank UI.
**Migration**: Use the deployed web app `/vocab` page (capability `web-app`), opened from the toolbar popup's "Open Vocab Bank" CTA.

### Requirement: Expand a word row to see full detail

**Reason**: The extension's internal Vocab Bank page is retired.
**Migration**: Word detail is viewed on the deployed web app `/vocab` page (capability `web-app`).

### Requirement: Search words and definitions

**Reason**: The extension's internal Vocab Bank page is retired.
**Migration**: Search is provided on the deployed web app `/vocab` page (capability `web-app`).

### Requirement: Delete a word from the bank

**Reason**: The extension's internal Vocab Bank page is retired.
**Migration**: Word management moves to the deployed web app `/vocab` page (capability `web-app`).

### Requirement: Navigate to the Review page

**Reason**: The extension's internal Vocab Bank page is retired; navigation to review now originates from the toolbar popup.
**Migration**: Use the toolbar popup's "Review" CTA, which opens the deployed web app `/review` page.

### Requirement: Display auth state and sign-in/sign-out controls

**Reason**: The extension's internal Vocab Bank page is retired; auth state and sign-in/out are handled by the toolbar popup and by the deployed web app itself.
**Migration**: Sign in/out from the toolbar popup; the deployed web app `/login` handles web-side auth.

### Requirement: Export vocab bank from extension

**Reason**: Export/import is retired permanently along with the internal Vocab Bank page.
**Migration**: None — the feature is removed. A future "add vocab" capability is planned separately.

### Requirement: Import vocab bank into extension

**Reason**: Export/import is retired permanently along with the internal Vocab Bank page.
**Migration**: None — the feature is removed. Saved words already sync to Supabase via the in-page save flow.
