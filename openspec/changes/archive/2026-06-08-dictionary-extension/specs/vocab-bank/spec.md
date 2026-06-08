## ADDED Requirements

### Requirement: Display all saved words as a list

The Vocab Bank page SHALL display all saved words in a scrollable list. Each row SHALL show the word, part of speech, truncated definition, encounter count, and the date of the most recent encounter.

#### Scenario: Bank has saved words

- **WHEN** user opens the Vocab Bank page
- **THEN** all saved words SHALL be displayed as list rows sorted by most recently saved first

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
