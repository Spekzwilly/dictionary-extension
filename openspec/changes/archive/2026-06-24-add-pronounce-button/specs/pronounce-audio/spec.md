## ADDED Requirements

### Requirement: Pronounce control on word-bearing surfaces

The system SHALL display a Pronounce control (speaker icon) next to the word on every surface that shows a vocab word: the extension definition popup, the web app `/vocab` list rows and expanded cards, and the web app `/review` cards. Activating the control SHALL play the word's pronunciation.

#### Scenario: Pronounce from extension popup

- **WHEN** the definition popup is open showing a word and the user clicks the speaker control
- **THEN** the system SHALL play the word's pronunciation honoring the current accent preference

#### Scenario: Pronounce from web vocab and review

- **WHEN** the user clicks the speaker control on a `/vocab` row, an expanded `/vocab` card, or a `/review` card
- **THEN** the web app SHALL fetch pronunciation data via `lookupWord` for that word and play it honoring the current accent preference

#### Scenario: Re-entrancy while playing

- **WHEN** pronunciation is already playing and the control is activated again
- **THEN** the control SHALL be in a disabled/active state that prevents a second overlapping playback until the current playback ends

### Requirement: Accent preference

Each surface SHALL provide an inline US | UK accent toggle beside the speaker control and SHALL persist the selected accent locally per surface (extension `chrome.storage.local`, web `localStorage`). The default accent SHALL be US. The selected accent SHALL govern which human-audio recording is preferred and which synthesized voice language is used.

#### Scenario: Default accent

- **WHEN** a user uses the Pronounce control for the first time on a surface with no stored preference
- **THEN** the accent SHALL default to US

#### Scenario: Accent persists

- **WHEN** the user switches the toggle to UK and later returns to that surface
- **THEN** the accent SHALL remain UK

### Requirement: Hybrid playback with fallback chain

Playback SHALL prefer human-recorded audio and fall back to browser text-to-speech so the control is never silent when speech is possible. On activation the system SHALL attempt, in order: (1) the chosen accent's human-audio URL, (2) the other accent's human-audio URL, (3) browser `SpeechSynthesis` in the chosen accent's language, and SHALL only present a disabled/unavailable state when none of these can play.

#### Scenario: Human audio available for chosen accent

- **WHEN** the chosen accent has a human-audio URL and it plays successfully
- **THEN** TTS SHALL NOT be used

#### Scenario: Fall back to other accent then TTS

- **WHEN** the chosen accent has no audio URL
- **THEN** the system SHALL play the other accent's audio URL if present, otherwise SHALL speak the word via `SpeechSynthesis` in the chosen accent's language

#### Scenario: Nothing playable

- **WHEN** there is no audio URL for either accent and `SpeechSynthesis` is unavailable in the environment
- **THEN** the Pronounce control SHALL render in a disabled state and SHALL NOT throw

##### Example: resolution order

| chosen | audio.us | audio.uk | SpeechSynthesis | Result                          |
| ------ | -------- | -------- | --------------- | ------------------------------- |
| US     | present  | present  | yes             | play `audio.us`                 |
| US     | absent   | present  | yes             | play `audio.uk`                 |
| UK     | present  | absent   | yes             | play `audio.us` (other accent)  |
| US     | absent   | absent   | yes             | TTS in `en-US`                  |
| US     | absent   | absent   | no              | control disabled                |

### Requirement: IPA phonetic display

When `lookupWord` returns IPA phonetic text for a word, the surface SHALL display that text next to the word. When no IPA text is available, the surface SHALL omit it without leaving a visible gap.

#### Scenario: IPA present

- **WHEN** a word's lookup result includes phonetic text such as `/həˈloʊ/`
- **THEN** the surface SHALL render that phonetic text next to the word

#### Scenario: IPA absent

- **WHEN** a word's lookup result has no phonetic text
- **THEN** the surface SHALL render no phonetic text and no placeholder
