## ADDED Requirements

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
