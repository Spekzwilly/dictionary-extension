## MODIFIED Requirements

### Requirement: Vocab bank page lists and searches saved words

The web app SHALL display a mobile-first list of all words the user has saved, fetched from Supabase. The list SHALL be searchable and each word SHALL expand to show full detail. Each word row SHALL provide a delete control that removes the entire entry for that word.

#### Scenario: Word list loads on page open

- **WHEN** authenticated user navigates to `/vocab`
- **THEN** all words in `vocab_entries` for that user SHALL be displayed, sorted by most recently saved first

#### Scenario: Empty bank state

- **WHEN** authenticated user has no saved words
- **THEN** an empty-state message SHALL be displayed

#### Scenario: Search filters word list

- **WHEN** user types into the search input
- **THEN** only words whose word text or definition contains the search string (case-insensitive) SHALL be shown

#### Scenario: Expand word row shows full detail

- **WHEN** user taps a word row
- **THEN** the row SHALL expand showing part of speech, full definition, example sentence (if any), and all encounter contexts (source URL, date, surrounding sentence)

#### Scenario: Delete control is visible on every word row

- **WHEN** the word list is displayed
- **THEN** each word row SHALL show a delete control without requiring the row to be expanded first
- **THEN** the control SHALL be rendered in red by default and a heavier red on hover

#### Scenario: Deleting an entry requires confirmation

- **WHEN** user activates the delete control on a word row
- **THEN** a confirmation prompt naming the word SHALL be shown before any deletion occurs
- **THEN** if the user cancels, the entry SHALL remain and nothing SHALL be deleted

#### Scenario: Confirmed delete removes the whole entry

- **WHEN** user confirms deletion of a word
- **THEN** the entire `vocab_entries` row for that word — its definition and all encounters — SHALL be deleted from Supabase, scoped to the signed-in user
- **THEN** the word SHALL be removed from the displayed list immediately, without refetching

#### Scenario: Delete failure restores the row

- **WHEN** the Supabase delete request returns an error after the row was optimistically removed
- **THEN** an error message SHALL be shown to the user
- **THEN** the list SHALL be restored so the entry reappears
