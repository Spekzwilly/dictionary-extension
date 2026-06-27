## MODIFIED Requirements

### Requirement: Add Vocab saves to the shared vocab bank

When a word with a successful lookup is confirmed, the system SHALL save it to the same Supabase `vocab_entries` bank used by the extension and web app, scoped to the signed-in user, and SHALL confirm success with a toast. Each save SHALL record one encounter with `url` set to the sentinel `"raycast://manual"` and a timestamp, and SHALL NOT attach a user-typed sentence to the encounter. The command SHALL NOT offer a secondary action for attaching an example sentence; the dictionary's own example sentence (already shown in the preview and stored on the saved definition) serves that role.

#### Scenario: Save a new word

- **WHEN** the user presses Enter on a found word that is not yet in the bank
- **THEN** the system SHALL create a `vocab_entries` row for that user with the looked-up definition and one `raycast://manual` encounter carrying no sentence, and SHALL show a success toast

#### Scenario: No attach-sentence action is offered

- **WHEN** the user views the actions for a found word
- **THEN** the action panel SHALL NOT include an "Add with sentence…" action

#### Scenario: Save failure is surfaced

- **WHEN** the Supabase write fails (for example, no network)
- **THEN** the system SHALL show an error toast and SHALL NOT report the word as saved
