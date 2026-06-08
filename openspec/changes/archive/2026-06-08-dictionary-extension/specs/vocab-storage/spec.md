## ADDED Requirements

### Requirement: Save word to vocab bank

The system SHALL save a word to `chrome.storage.local` when the user clicks "Save" in the definition popup. Each save SHALL record the word's definition snapshot, the source article URL, the surrounding sentence, and a timestamp.

#### Scenario: Save a new word

- **WHEN** user clicks "Save" in the popup for a word not yet in the bank
- **THEN** a new entry SHALL be created in storage with the WordDefinition and one encounter record

#### Scenario: Save a word already in the bank

- **WHEN** user clicks "Save" for a word that already exists in the bank
- **THEN** the existing definition SHALL remain unchanged and a new encounter SHALL be appended to `encounters[]`

##### Example: encounter accumulation

- **GIVEN** "ephemeral" is already saved with 1 encounter from techcrunch.com
- **WHEN** user saves "ephemeral" again from medium.com
- **THEN** the entry SHALL have 2 encounters: one from techcrunch.com and one from medium.com, definition unchanged

---

### Requirement: WordDefinition data shape

The system SHALL store word data using the following shape:

```
VocabEntry {
  word: string           // lowercase
  definition: {
    word: string
    partOfSpeech: string
    definition: string
    example?: string
  }
  encounters: Array<{
    url: string          // document.location.href at save time
    sentence: string     // surrounding sentence of the selected text
    savedAt: number      // Date.now() timestamp
  }>
}
```

#### Scenario: Data persists across browser restarts

- **WHEN** words are saved and the browser is restarted
- **THEN** all saved words SHALL still be present in `chrome.storage.local`

---

### Requirement: Delete word from storage

The system SHALL remove a word entry entirely from storage when the user deletes it.

#### Scenario: Delete a saved word

- **WHEN** user deletes a word from the Vocab Bank page
- **THEN** the word's entry SHALL be removed from `chrome.storage.local` and SHALL NOT appear in subsequent reads

---

### Requirement: Retrieve all saved words

The system SHALL expose a method to retrieve all saved words as an array of `VocabEntry` objects.

#### Scenario: Retrieve with saved words

- **WHEN** `getAllWords` is called and words exist in storage
- **THEN** all stored entries SHALL be returned as an array

#### Scenario: Retrieve with empty bank

- **WHEN** `getAllWords` is called and no words have been saved
- **THEN** an empty array SHALL be returned
