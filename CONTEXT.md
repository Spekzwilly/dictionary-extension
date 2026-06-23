# Context — Dictionary Extension

A glossary of the domain language used across this project. Implementation details live in code and ADRs, not here.

## Glossary

### Pronounce
The user action of hearing a vocab word spoken aloud. Triggered from a speaker control on any card that shows a word. Honors the user's chosen **Accent**, and degrades gracefully when human audio for that word/accent is unavailable.

### Accent
The user's chosen pronunciation variant of English: **US** or **UK**. A persisted per-surface preference (default US). Governs which human-audio recording is preferred and, when none exists, which synthesized voice is used.
