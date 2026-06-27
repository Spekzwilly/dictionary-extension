# dictionary-lookup Specification

## Purpose

TBD - created by archiving change 'dictionary-extension'. Update Purpose after archive.

## Requirements

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

---
### Requirement: Lookup result includes pronunciation audio and IPA

`lookupWord` SHALL parse the Free Dictionary API's `phonetics[]` array and return, when present, accent-keyed human-audio URLs and IPA phonetic text on the `WordDefinition` result. The result SHALL expose `audio?: { us?: string; uk?: string }` and `phonetic?: string`. Audio entries SHALL be mapped to an accent by the `-us` / `-uk` suffix in the audio file URL; entries whose URL has no recognized suffix (including `-au` and unsuffixed) SHALL be ignored for accent mapping. `phonetic` SHALL be the first non-empty `text` value found in `phonetics[]`.

When no usable audio or IPA is present, the corresponding fields SHALL be absent (`undefined`) and the existing word/part-of-speech/definition/example behavior SHALL be unchanged.

#### Scenario: Word has both US and UK audio

- **WHEN** `lookupWord` resolves a word whose API response includes audio URLs ending `-us.mp3` and `-uk.mp3`
- **THEN** the result SHALL include `audio.us` and `audio.uk` set to those URLs

#### Scenario: Word has only one accent's audio

- **WHEN** the API response includes only a `-uk.mp3` audio URL
- **THEN** the result SHALL include `audio.uk` and SHALL leave `audio.us` undefined

#### Scenario: Word has no audio

- **WHEN** the API response contains no usable audio URLs
- **THEN** the result SHALL leave `audio` undefined and SHALL still return word, part of speech, and definition

#### Scenario: IPA text extracted

- **WHEN** the API response includes a `phonetics[]` entry with non-empty `text`
- **THEN** the result `phonetic` SHALL equal the first such non-empty `text`

##### Example: accent mapping by URL suffix

| Audio file URL                         | Mapped accent |
| -------------------------------------- | ------------- |
| `.../hello-us.mp3`                     | `audio.us`    |
| `.../hello-uk.mp3`                     | `audio.uk`    |
| `.../hello-au.mp3`                     | ignored       |
| `.../hello.mp3`                        | ignored       |
| `""` (empty audio field)               | ignored       |

---
### Requirement: Example sentence sourced from first available definition

`lookupWord` SHALL keep the first definition (`meanings[0].definitions[0].definition`) as the primary definition, but SHALL source the `example` field from the first definition that has a non-empty `example`, scanning across all entries and all meanings in payload order. When no definition in the payload has an `example`, the `example` field SHALL be absent (`undefined`).

#### Scenario: Example backfilled from a later definition

- **WHEN** a word's first definition has no `example` but a later definition (in the same or another meaning) does
- **THEN** the result's `definition` SHALL be the first definition's text
- **AND** the result's `example` SHALL be that later definition's example sentence

##### Example: example sourced from a later sense

- **GIVEN** API returns meanings[0].definitions[0] = { definition: "lasting a very short time" } (no example), and meanings[0].definitions[2] = { definition: "...", example: "the ephemeral joys of childhood" }
- **WHEN** `lookupWord("ephemeral")` resolves
- **THEN** result.definition = "lasting a very short time"
- **AND** result.example = "the ephemeral joys of childhood"

#### Scenario: No example anywhere in payload

- **WHEN** no definition across any meaning has an `example`
- **THEN** the result's `example` field SHALL be absent (`undefined`)
