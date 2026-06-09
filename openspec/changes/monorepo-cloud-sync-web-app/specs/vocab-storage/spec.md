## MODIFIED Requirements

### Requirement: Save word to vocab bank

The system SHALL save a word to `chrome.storage.local` when the user clicks "Save" in the definition popup. Each save SHALL record the word's definition snapshot, the source article URL, the surrounding sentence, and a timestamp. When the user is authenticated, the system SHALL additionally upsert the word to Supabase `vocab_entries`, appending the new encounter to the existing `encounters` array on conflict.

#### Scenario: Save a new word (signed out)

- **WHEN** user clicks "Save" in the popup for a word not yet in the bank and is not signed in
- **THEN** a new entry SHALL be created in `chrome.storage.local` with the definition and one encounter record

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

---

### Requirement: Retrieve all saved words

The system SHALL expose a method to retrieve all saved words as an array of `VocabEntry` objects. When the user is authenticated, words SHALL be read from Supabase. When the user is not authenticated, words SHALL be read from `chrome.storage.local`.

#### Scenario: Retrieve with saved words (signed in)

- **WHEN** `getAllWords` is called and the user is signed in
- **THEN** all entries from Supabase `vocab_entries` for that user SHALL be returned

#### Scenario: Retrieve with saved words (signed out)

- **WHEN** `getAllWords` is called and the user is not signed in
- **THEN** all entries from `chrome.storage.local` SHALL be returned

#### Scenario: Retrieve with empty bank

- **WHEN** `getAllWords` is called and no words have been saved
- **THEN** an empty array SHALL be returned

## ADDED Requirements

### Requirement: Export vocab bank as JSON

The system SHALL serialize the full vocab bank to a JSON file and trigger a browser download when `exportVocab()` is called.

#### Scenario: Export produces downloadable JSON file

- **WHEN** `exportVocab()` is called
- **THEN** the browser SHALL download a file named `vocab-export-<YYYY-MM-DD>.json` containing all entries as a `VocabEntry[]` JSON array

#### Scenario: Export reflects current source

- **WHEN** user is signed in and calls `exportVocab()`
- **THEN** the exported data SHALL reflect the current Supabase entries for that user

---

### Requirement: Import vocab bank from JSON

The system SHALL accept a `VocabEntry[]` JSON file, validate each entry, and upsert valid entries to Supabase, merging encounters for duplicate words.

#### Scenario: Import valid JSON file

- **WHEN** user provides a valid `VocabEntry[]` JSON file
- **THEN** all valid entries SHALL be upserted to Supabase
- **THEN** for words that already exist, encounters SHALL be merged and deduplicated by `savedAt` timestamp

#### Scenario: Import with duplicate encounters

- **WHEN** an imported file contains encounters that already exist in Supabase (same `savedAt` timestamp)
- **THEN** duplicate encounters SHALL NOT be added

#### Scenario: Import with invalid entries

- **WHEN** the JSON file contains entries that do not match the `VocabEntry` shape
- **THEN** invalid entries SHALL be skipped
- **THEN** the system SHALL report how many entries were imported and how many were skipped
