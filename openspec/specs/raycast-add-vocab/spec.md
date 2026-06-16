# raycast-add-vocab Specification

## Purpose

TBD - created by archiving change 'add-vocab-raycast'. Update Purpose after archive.

## Requirements

### Requirement: Add Vocab command looks up and previews a word

The Raycast extension SHALL provide an "Add Vocab" view command. As the user types a word, the system SHALL perform a debounced lookup against the dictionary service and display a preview of the resolved definition, including the part of speech, definition text, and example sentence when present. The system SHALL auto-select the first/primary meaning returned by the dictionary.

#### Scenario: Typing a known word shows a definition preview

- **WHEN** the user types a word found in the dictionary into the Add Vocab command
- **THEN** the command SHALL display the word's part of speech, definition, and example sentence (if any) as a preview

#### Scenario: Word not found blocks the save

- **WHEN** the user enters a word the dictionary returns as not found
- **THEN** the command SHALL surface a "not found" message and SHALL NOT save any entry


<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->

---
### Requirement: Add Vocab saves to the shared vocab bank

When a word with a successful lookup is confirmed, the system SHALL save it to the same Supabase `vocab_entries` bank used by the extension and web app, scoped to the signed-in user, and SHALL confirm success with a toast. Each save SHALL record one encounter with `url` set to the sentinel `"raycast://manual"`, a timestamp, and a sentence that is empty by default. The system SHALL provide a secondary "Add with sentence…" action that lets the user attach an example sentence to the encounter before saving.

#### Scenario: Save a new word

- **WHEN** the user presses Enter on a found word that is not yet in the bank
- **THEN** the system SHALL create a `vocab_entries` row for that user with the looked-up definition and one `raycast://manual` encounter, and SHALL show a success toast

#### Scenario: Save with an attached sentence

- **WHEN** the user invokes "Add with sentence…", enters a sentence, and confirms
- **THEN** the saved encounter SHALL carry that sentence and the `raycast://manual` sentinel url

#### Scenario: Save failure is surfaced

- **WHEN** the Supabase write fails (for example, no network)
- **THEN** the system SHALL show an error toast and SHALL NOT report the word as saved


<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->

---
### Requirement: Re-adding an existing word appends an encounter

When the user saves a word already present in the bank, the system SHALL append a new encounter and merge encounters by timestamp rather than creating a duplicate row or overwriting the existing definition. The preview SHALL indicate that the word is already saved.

#### Scenario: Already-saved word shows a hint

- **WHEN** the user types a word that already exists in the bank
- **THEN** the preview SHALL show an "Already saved" indicator

#### Scenario: Re-adding appends rather than duplicates

- **WHEN** the user saves a word that already exists in the bank
- **THEN** the existing row SHALL gain one additional encounter, with no duplicate row created and the existing definition unchanged


<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->

---
### Requirement: Implicit sign-in and in-command sign-out

The Add Vocab command SHALL require an authenticated Supabase session to save. When the user runs Add Vocab while signed out, the system SHALL initiate Google sign-in and, on success, proceed with the intended action. The command SHALL expose "Sign out" as a secondary action rather than a separate command.

#### Scenario: First use while signed out starts sign-in

- **WHEN** the user runs Add Vocab while no valid session exists
- **THEN** the system SHALL start the Google sign-in flow before allowing a save

#### Scenario: Sign out from within the command

- **WHEN** the user invokes the "Sign out" action
- **THEN** the stored session SHALL be cleared and subsequent saves SHALL require signing in again

<!-- @trace
source: add-vocab-raycast
updated: 2026-06-16
code:
  - dictionary-extension-prd.md
  - raycast-add-vocab-prd.md
-->