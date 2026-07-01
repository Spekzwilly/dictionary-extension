# Context — Dictionary Extension

A glossary of the domain language used across this project. Implementation details live in code and ADRs, not here.

## Glossary

### Pronounce
The user action of hearing a vocab word spoken aloud. Triggered from a speaker control on any card that shows a word. Honors the user's chosen **Accent**, and degrades gracefully when human audio for that word/accent is unavailable.

### Accent
The user's chosen pronunciation variant of English: **US** or **UK**. A persisted per-surface preference (default US). Governs which human-audio recording is preferred and, when none exists, which synthesized voice is used.

### Card Review
The atomic unit of practice: the user rating one card during review. Rating one card is one Card Review. This — not finishing a whole session — is what "doing your reps" counts.

### Review-Day
A single calendar day, measured on the **user's local clock**, on which at least one Card Review happened. The unit of the Progress graph. A day with zero Card Reviews is a gap; a day with any is *lit*. A day is defined by the user's clock, not the server's — late-night reps belong to the day the user experienced them.

### Intensity
How much practice a Review-Day holds: the count of Card Reviews that day. Rendered as the color depth of a Progress cell — more reviews, darker cell. Distinct from whether a day is lit (that's binary); Intensity is *how much*.

### Streak
A run of consecutive Review-Days. **Current streak** counts backward from today, and stays alive through today even before you review — it only breaks once a whole day passes with zero Card Reviews. **Longest streak** is the longest such run ever achieved. The number that expresses consistency.

### Progress
The surface where the user sees their review consistency: a GitHub-style graph of the trailing ~12 months, one cell per Review-Day, shaded by Intensity, alongside their current and longest Streak. Answers "am I keeping this up?"
