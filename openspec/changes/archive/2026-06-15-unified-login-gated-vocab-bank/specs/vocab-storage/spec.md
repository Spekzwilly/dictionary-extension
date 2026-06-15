## MODIFIED Requirements

### Requirement: Save word to vocab bank

The system SHALL save a word only when the user is authenticated. When the user clicks "Save" in the definition popup — a control shown only while signed in — the system SHALL write the entry to `chrome.storage.local` and additionally upsert the word to Supabase `vocab_entries`, appending the new encounter to the existing `encounters` array on conflict. Each save SHALL record the word's definition snapshot, the source article URL, the surrounding sentence, and a timestamp. When the user is not authenticated, the definition popup SHALL NOT offer "Save"; it SHALL surface a "Sign in with Google" affordance instead, and no entry SHALL be written.

#### Scenario: Save is unavailable when signed out

- **WHEN** user selects a word and the definition popup is shown while not signed in
- **THEN** the popup SHALL display a "Sign in with Google" button in place of "Save"
- **THEN** no entry SHALL be written to `chrome.storage.local` or Supabase until the user signs in

#### Scenario: Save a new word (signed in)

- **WHEN** user clicks "Save" in the popup for a word not yet in the bank and is signed in
- **THEN** a new entry SHALL be created in `chrome.storage.local`
- **THEN** the word SHALL be upserted to Supabase `vocab_entries` with one encounter

#### Scenario: Save a word already in the bank (signed in)

- **WHEN** user clicks "Save" for a word that already exists in the bank and is signed in
- **THEN** the existing definition SHALL remain unchanged
- **THEN** a new encounter SHALL be appended to `encounters[]` in both `chrome.storage.local` and Supabase

##### Example: encounter accumulation across surfaces

- **GIVEN** "ephemeral" is already saved with 1 encounter from techcrunch.com
- **WHEN** user saves "ephemeral" again from medium.com (signed in)
- **THEN** the entry SHALL have 2 encounters in both local storage and Supabase
