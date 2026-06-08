## ADDED Requirements

### Requirement: Popup triggers on text selection

The content script SHALL monitor text selection events on any webpage. When the user selects 1–3 words and releases the mouse, the system SHALL fetch the definition and display the popup near the selection.

#### Scenario: Valid word selected

- **WHEN** user selects a single English word on any webpage
- **THEN** the definition popup SHALL appear within 1 second showing the word, part of speech, definition, and example sentence

#### Scenario: Selection too long

- **WHEN** user selects more than 3 words
- **THEN** the popup SHALL NOT appear

#### Scenario: Whitespace-only selection

- **WHEN** user selects only whitespace or punctuation
- **THEN** the popup SHALL NOT appear

---

### Requirement: Selected word is underlined

The content script SHALL visually underline the selected word in the host page to anchor the popup to the source text.

#### Scenario: Popup opens

- **WHEN** the definition popup appears
- **THEN** the selected word in the article SHALL be underlined with the indigo accent color (#6366f1)

#### Scenario: Popup dismisses

- **WHEN** the popup is dismissed
- **THEN** the underline span SHALL be removed and the host page text SHALL return to its original appearance

---

### Requirement: Word not found shows graceful fallback

When the Free Dictionary API returns a 404 or a network error occurs, the system SHALL display a "not found" state rather than an empty or broken popup.

#### Scenario: API returns 404

- **WHEN** the Free Dictionary API returns a 404 for the selected word
- **THEN** the popup SHALL display "No definition found for '{word}'"

#### Scenario: Network error

- **WHEN** a network error occurs during the API fetch
- **THEN** the popup SHALL display a graceful error message and SHALL NOT throw an uncaught exception

---

### Requirement: Popup dismisses on outside click

The popup SHALL dismiss when the user clicks anywhere outside the popup shadow root.

#### Scenario: Click outside popup

- **WHEN** the popup is open and user clicks outside the shadow root
- **THEN** the popup SHALL close and the underline span SHALL be removed

#### Scenario: New selection while popup open

- **WHEN** user makes a new text selection while a popup is already open
- **THEN** the existing popup SHALL close and a new lookup SHALL begin for the new selection

---

### Requirement: Popup does not interfere with host page styles

The popup SHALL render inside a Shadow DOM root so that host-page CSS cannot affect popup appearance, and popup CSS cannot affect host-page layout.

#### Scenario: Popup on a page with custom CSS

- **WHEN** the popup renders on any webpage
- **THEN** popup styles SHALL be fully isolated from host-page styles via Shadow DOM
