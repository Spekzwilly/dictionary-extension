## 1. Lookup returns pronunciation data

- [x] 1.1 `lookupWord` returns `audio?: { us?: string; uk?: string }` and `phonetic?: string` on `WordDefinition`; types updated in `packages/shared/src/types.ts`. Verify: `npm run build --workspace=@dictionary/shared` typechecks.
- [x] 1.2 Satisfies **Lookup result includes pronunciation audio and IPA**: `lookupWord` parses `phonetics[]` — maps audio by `-us`/`-uk` URL suffix (ignoring `-au`/unsuffixed/empty), and takes first non-empty `text` as `phonetic`. Verify: new unit tests in `packages/shared/src/__tests__/` cover both-accents, single-accent, no-audio, and IPA-extraction cases (the spec's accent-mapping example table); `npm test --workspace=@dictionary/shared` passes.

## 2. Shared browser pronounce helper

- [x] 2.1 Satisfies **Hybrid playback with fallback chain**: a browser-only pronounce helper resolves playback via the fallback chain (chosen-accent audio → other-accent audio → `SpeechSynthesis` in chosen lang → unavailable) given a `WordDefinition` + accent, and reports whether anything was playable. Kept out of `@dictionary/shared`'s node-imported path. Verify: helper unit test asserts the spec's resolution-order table outcomes (mocking `Audio` + `speechSynthesis`).
- [x] 2.2 Satisfies **Accent preference**: an accent-preference store reads/writes US|UK per surface (default US) — `chrome.storage.local` for the extension, `localStorage` for web. Verify: manual assertion that switching accent persists across reload on each surface.

## 3. Extension popup UI

- [x] 3.1 Satisfies **Pronounce control on word-bearing surfaces** (extension): `DefinitionPopup` renders a speaker control + inline US|UK accent toggle beside the word, plays via the helper honoring the stored accent, shows a disabled/active state while playing, and greys out when nothing is playable. Verify: load unpacked from `packages/extension/.output/chrome-mv3`, select a word, confirm audio plays, accent toggle switches source, and a no-audio word falls back to TTS.
- [x] 3.2 Satisfies **IPA phonetic display**: `DefinitionPopup` shows IPA phonetic text next to the word when present and omits it (no gap) when absent. Verify: manual check on a word with IPA and one without.

## 4. Web app UI (vocab + review)

- [x] 4.1 Satisfies **Pronounce control on word-bearing surfaces** (web vocab): `/vocab` list rows and expanded cards render the speaker control + accent toggle + IPA, fetching pronunciation via `lookupWord` on click and playing through the helper. Verify: `cd packages/web && npm run dev`, click pronounce on a row and expanded card, confirm playback, accent switch, and TTS fallback.
- [x] 4.2 Satisfies **Pronounce control on word-bearing surfaces** (web review): `/review` cards render the speaker control + accent toggle + IPA with the same click-to-fetch playback. Verify: run a review session in the dev server and confirm pronounce works on a card.

## 5. Build and verification

- [x] 5.1 Whole monorepo builds and all tests pass. Verify: `npm run build` and `npm test --workspace=@dictionary/shared` && `npm test --workspace=@dictionary/extension` succeed.
