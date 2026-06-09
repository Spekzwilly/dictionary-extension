# vocab-bank Specification

## Purpose

TBD - created by archiving change 'dictionary-extension'. Update Purpose after archive.

## Requirements

### Requirement: Display all saved words as a list

The Vocab Bank page SHALL display all saved words in a scrollable list. Each row SHALL show the word, part of speech, truncated definition, encounter count, and the date of the most recent encounter. When the user is signed in, words SHALL be loaded from Supabase. When the user is signed out, words SHALL be loaded from `chrome.storage.local`.

#### Scenario: Bank has saved words (signed in)

- **WHEN** user opens the Vocab Bank page and is signed in
- **THEN** all words from Supabase `vocab_entries` SHALL be displayed, sorted by most recently saved first

#### Scenario: Bank has saved words (signed out)

- **WHEN** user opens the Vocab Bank page and is not signed in
- **THEN** all words from `chrome.storage.local` SHALL be displayed

#### Scenario: Bank is empty

- **WHEN** user opens the Vocab Bank page with no saved words
- **THEN** an empty-state message SHALL be displayed

---
### Requirement: Expand a word row to see full detail

The list SHALL behave as an accordion. Clicking a row SHALL expand it to show the full definition, example sentence, and all encounter contexts (source URL, date, sentence). Only one row SHALL be expanded at a time.

#### Scenario: Expand a word

- **WHEN** user clicks a collapsed word row
- **THEN** the row SHALL expand showing full definition, example, and all encounter contexts

#### Scenario: Collapse by clicking the same row

- **WHEN** user clicks an already-expanded word row
- **THEN** the row SHALL collapse

#### Scenario: Opening another row collapses the current one

- **WHEN** user clicks a second word row while another is already expanded
- **THEN** the previously expanded row SHALL collapse and the new row SHALL expand

---
### Requirement: Search words and definitions

The Vocab Bank page SHALL provide a search input that filters the word list in real time.

#### Scenario: Search by word

- **WHEN** user types a partial word into the search input
- **THEN** only rows whose word contains the search string (case-insensitive) SHALL be displayed

#### Scenario: Search by definition text

- **WHEN** user types text that appears in a definition but not in a word
- **THEN** rows whose definition contains the search string SHALL be displayed

#### Scenario: No matches

- **WHEN** the search string matches no words or definitions
- **THEN** a "No words matching '{query}'" message SHALL be displayed

---
### Requirement: Delete a word from the bank

The user SHALL be able to delete a word from within its expanded row. Deletion SHALL remove the word from storage and from the list immediately.

#### Scenario: Delete a word

- **WHEN** user clicks "Remove from bank" inside an expanded row
- **THEN** the word SHALL be removed from `chrome.storage.local` and SHALL disappear from the list

---
### Requirement: Navigate to the Review page

The Vocab Bank page SHALL include a "Review →" CTA button that opens the Review page.

#### Scenario: Click Review button

- **WHEN** user clicks "Review →"
- **THEN** the Review page SHALL open

---
### Requirement: Display auth state and sign-in/sign-out controls

The Vocab Bank page SHALL display the user's authentication state and provide controls to sign in or sign out.

#### Scenario: Signed-out state

- **WHEN** user opens the Vocab Bank page and is not signed in
- **THEN** a "Sign in with Google" button SHALL be displayed

#### Scenario: Signed-in state

- **WHEN** user opens the Vocab Bank page and is signed in
- **THEN** the user's Google account email SHALL be displayed along with a "Sign out" button

#### Scenario: Signing in updates the word list

- **WHEN** user signs in from the Vocab Bank page
- **THEN** the word list SHALL reload from Supabase after sign-in completes

---
### Requirement: Export vocab bank from extension

The Vocab Bank page SHALL provide an "Export JSON" button that downloads the current vocab bank as a JSON file.

#### Scenario: Export button triggers download

- **WHEN** user clicks "Export JSON"
- **THEN** the browser SHALL download a JSON file containing all saved words

---
### Requirement: Import vocab bank into extension

The Vocab Bank page SHALL provide an "Import JSON" button that accepts a `VocabEntry[]` JSON file and upserts the entries to Supabase.

#### Scenario: Import button opens file picker

- **WHEN** user clicks "Import JSON"
- **THEN** a file picker SHALL open filtered to `.json` files

#### Scenario: Successful import updates the word list

- **WHEN** user selects a valid JSON file and the import completes
- **THEN** the word list SHALL reload to reflect the newly imported words
- **THEN** a success message SHALL show how many words were imported

#### Scenario: Import requires sign-in

- **WHEN** user is not signed in and clicks "Import JSON"
- **THEN** an error message SHALL inform the user they must sign in before importing
