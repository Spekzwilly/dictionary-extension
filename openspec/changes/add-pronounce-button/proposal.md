## Why

The vocab tool shows definitions but can't speak a word — learners can't hear how vocab is pronounced, which is core to language learning. Users want a one-click Pronounce control, and the freedom to hear it in their preferred accent.

## What Changes

- Add a **Pronounce** control (🔊) next to every displayed word in the extension definition popup and the web app's `/vocab` (list + expanded) and `/review` surfaces.
- Add an inline **US | UK accent toggle** beside the speaker, with the choice persisted per-surface (default US).
- Playback is **hybrid**: play the human-recorded audio from dictionaryapi.dev when available; otherwise fall back to the browser's `SpeechSynthesis` (TTS). Fallback chain on click: chosen-accent audio → other-accent audio → TTS in the chosen language → grey out if nothing works.
- Extend `lookupWord` so its result carries accent-keyed audio URLs and IPA text (currently the API's `phonetics[]` is discarded). The web app **refetches** via `lookupWord` on click (no schema/migration, no stored audio).
- Show **IPA phonetic text** next to the word when present.

## Non-Goals

- **Raycast pronounce** — deferred (Node sandbox has no `SpeechSynthesis`/Web Audio; needs shell `say`/`afplay` plumbing). Out of scope for this change.
- **Accents beyond US/UK** (AU/IN) — sparse API coverage; excluded.
- **Persisting audio URLs / IPA into `vocab_entries`** — rejected in favor of refetch-on-click (no migration, no URL rot).
- **Cross-device accent sync** — each surface owns its own preference.

## Capabilities

### New Capabilities

- `pronounce-audio`: The Pronounce action — speaker control on word-bearing surfaces, per-surface US/UK accent preference, hybrid human-audio/TTS playback with a graceful fallback chain, and IPA display.

### Modified Capabilities

- `dictionary-lookup`: `lookupWord` result gains optional accent-keyed audio URLs (`audio?: { us?: string; uk?: string }`) and IPA text (`phonetic?: string`), parsed from the API's `phonetics[]` by URL suffix.

## Impact

- Affected specs: new `pronounce-audio`; modified `dictionary-lookup`.
- Affected code:
  - `packages/shared/src/types.ts` — extend `WordDefinition` with `audio?` + `phonetic?`.
  - `packages/shared/src/dictionary.ts` — parse `phonetics[]` (US/UK suffix, first-non-empty IPA).
  - `packages/shared/src/__tests__/` — lookup parsing tests.
  - `packages/extension/lib/components/DefinitionPopup.tsx` — speaker + accent toggle + IPA.
  - `packages/web/src/pages/VocabPage.tsx`, `packages/web/src/pages/ReviewPage.tsx` (or review component) — speaker + accent toggle + IPA; refetch on click.
  - New browser-only pronounce helper (Audio + `speechSynthesis` fallback chain) + accent-preference storage — shared between extension and web, kept out of `@dictionary/shared`'s node-imported path.
