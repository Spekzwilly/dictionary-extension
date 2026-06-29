# dictionary-lookup Specification

## Purpose

TBD - created by archiving change 'dictionary-extension'. Update Purpose after archive.

## Requirements

### Requirement: Popup triggers on text selection

The content script SHALL monitor text selection events on any webpage. When the user selects 1–3 words and releases the mouse, the system SHALL fetch the definition and display the popup near the selection.

#### Scenario: Valid word selected

- **WHEN** user selects a single English word on any webpage
- **THEN** the definition popup SHALL appear within 1 second showing the word, part of speech, and one or more senses, each with its definition and any example sentences

#### Scenario: Selection too long

- **WHEN** user selects more than 3 words
- **THEN** the popup SHALL NOT appear

#### Scenario: Whitespace-only selection

- **WHEN** user selects only whitespace or punctuation
- **THEN** the popup SHALL NOT appear


<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->

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

`lookupWord` SHALL try the Merriam-Webster proxy first; on an M-W not-found (M-W returns suggestion strings), proxy error, or absent proxy config, it SHALL fall back to the keyless `dictionaryapi.dev` source. The system SHALL display a "not found" state only when both sources miss, rather than an empty or broken popup. A proxy or network failure SHALL degrade to the fallback source silently and SHALL NOT throw an uncaught exception.

#### Scenario: M-W misses, fallback hits

- **WHEN** M-W returns suggestions (no entry) for the selected word but `dictionaryapi.dev` has a definition
- **THEN** the result SHALL be built from `dictionaryapi.dev`
- **AND** the popup SHALL show the definition, not a "not found" state

#### Scenario: Both sources miss

- **WHEN** neither M-W nor `dictionaryapi.dev` has the selected word
- **THEN** the popup SHALL display "No definition found for '{word}'"

#### Scenario: Proxy unreachable

- **WHEN** the proxy returns a non-2xx response or a network error occurs
- **THEN** lookup SHALL fall back to `dictionaryapi.dev`
- **AND** SHALL NOT throw an uncaught exception


<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->

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

When lookup resolves via the keyless `dictionaryapi.dev` fallback, the parser SHALL map the API payload into the `senses` shape: the first definition (`meanings[0].definitions[0].definition`) SHALL become the primary sense's `definition`, and example sentences SHALL be sourced from definitions that carry a non-empty `example`, scanning across all entries and meanings in payload order. When no definition in the payload has an `example`, the sense's `examples` SHALL be absent (`undefined`).

#### Scenario: Example backfilled from a later definition

- **WHEN** a word's first definition has no `example` but a later definition (in the same or another meaning) does
- **THEN** the primary sense's `definition` SHALL be the first definition's text
- **AND** the primary sense's `examples` SHALL include that later definition's example sentence

##### Example: example sourced from a later sense

- **GIVEN** API returns meanings[0].definitions[0] = { definition: "lasting a very short time" } (no example), and meanings[0].definitions[2] = { definition: "...", example: "the ephemeral joys of childhood" }
- **WHEN** `lookupWord("ephemeral")` resolves via the fallback source
- **THEN** the primary sense `definition` = "lasting a very short time"
- **AND** the primary sense `examples` includes "the ephemeral joys of childhood"

#### Scenario: No example anywhere in payload

- **WHEN** no definition across any meaning has an `example`
- **THEN** the primary sense's `examples` field SHALL be absent (`undefined`)


<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->

---
### Requirement: Primary lookup sources from Merriam-Webster Learner's via a proxy

`lookupWord` SHALL use the Merriam-Webster Learner's Dictionary as the primary source, reached through a server-side proxy so the M-W API key is never present in any client build. The proxy SHALL be a Supabase Edge Function (`mw-lookup`) that injects the `MW_API_KEY` secret, calls M-W, and returns M-W's JSON verbatim with CORS headers permitting the extension and web app origins. Callers SHALL authenticate to the proxy with the Supabase anon key. `lookupWord` SHALL receive the proxy URL and anon key via an options argument (`{ mwProxyUrl, mwApiKey }`); when `mwProxyUrl` is absent, `lookupWord` SHALL skip M-W entirely and proceed to the fallback source.

#### Scenario: M-W returns a multi-sense entry

- **WHEN** `lookupWord` is called with a valid `mwProxyUrl` and the word exists in M-W Learner's
- **THEN** the proxy SHALL be called at `<mwProxyUrl>?word=<word>` with the anon key in the request headers
- **AND** the result SHALL be a `WordDefinition` built from M-W's data

#### Scenario: No proxy configured

- **WHEN** `lookupWord` is called without an `mwProxyUrl`
- **THEN** M-W SHALL NOT be called
- **AND** lookup SHALL proceed directly to the keyless fallback source

#### Scenario: Key never ships client-side

- **WHEN** any client build (extension, web, Raycast) is inspected
- **THEN** the M-W API key SHALL NOT be present
- **AND** the key SHALL exist only as the Edge Function's `MW_API_KEY` secret


<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->

---
### Requirement: Lookup result carries multiple senses with examples

A successful `WordDefinition` SHALL expose a non-empty `senses` array, where each `Sense` has a `definition` string and an optional `examples` string array. The M-W parser SHALL extract senses from M-W's `def` sense-sequence tree, reading each sense's defining text and its example sentences (`vis`). The parser SHALL tolerate unknown node types in the tree by skipping them rather than failing.

#### Scenario: Word with several senses

- **WHEN** `lookupWord` resolves a word that M-W returns with multiple senses
- **THEN** the result `senses` SHALL contain one entry per parsed sense
- **AND** each entry's `examples` SHALL contain that sense's example sentences when present

#### Scenario: Sense without examples

- **WHEN** a parsed M-W sense has defining text but no `vis` examples
- **THEN** the corresponding `Sense.definition` SHALL be set
- **AND** that `Sense.examples` SHALL be absent


<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->

---
### Requirement: Legacy single-definition entries normalize to senses

The system SHALL provide a `normalizeDefinition` helper guaranteeing every `WordDefinition` exposes a populated `senses` array. For stored vocab entries persisted in the prior single-`definition` shape (no `senses`), `normalizeDefinition` SHALL synthesize a one-element `senses` array from the legacy `definition` and `example` fields. No migration of stored Supabase rows SHALL be required.

#### Scenario: Old stored entry read back

- **WHEN** a `WordDefinition` with `definition` and `example` but no `senses` is passed to `normalizeDefinition`
- **THEN** the returned value SHALL have `senses` of length 1
- **AND** that sense's `definition` SHALL equal the legacy `definition`
- **AND** that sense's `examples` SHALL contain the legacy `example` when present

##### Example: legacy entry normalization

- **GIVEN** a stored definition `{ word: "ephemeral", partOfSpeech: "adjective", definition: "lasting a very short time", example: "the ephemeral joys of childhood" }`
- **WHEN** `normalizeDefinition` is applied
- **THEN** result `senses` = `[{ definition: "lasting a very short time", examples: ["the ephemeral joys of childhood"] }]`

<!-- @trace
source: merriam-webster-lookup
updated: 2026-06-29
code:
  - README.md
-->