## 1. Dictionary example sourcing

- [x] 1.1 Satisfy **Example sentence sourced from first available definition**: in `packages/shared/src/dictionary.ts`, keep `definitions[0].definition` as the primary definition but set `example` to the first non-empty `example` found scanning all entries → meanings → definitions; leave `example` undefined when none exist. Verified by a new case in `packages/shared/src/__tests__/dictionary.test.ts` asserting the example is backfilled from a later definition, plus an existing-pass for a payload with no example anywhere.

## 2. Stop capturing the page sentence

- [x] 2.1 Make `Encounter.sentence` optional (`sentence?: string`) in `packages/shared/src/types.ts`, so saves without a sentence are valid. Verified by `npm run build --workspace=@dictionary/shared` (tsc) passing.
- [x] 2.2 Satisfy **Save word to vocab bank**: in `packages/extension/entrypoints/content.ts`, remove `getSurroundingSentence` and save with `sentence: ''` so no page text is captured while the encounter still records URL + timestamp. Verified by `npm test --workspace=@dictionary/extension` (vocab-storage tests still pass) and a manual save showing no quoted page fragment under "Saved from".

## 3. Verify end-to-end

- [x] 3.1 Confirm `definition.example` renders on Review and Vocab pages for a freshly looked-up word that previously showed blank, and that empty `sentence` encounters render no quote. Verified by `npm run build` (all packages) passing and a manual check in the web app against a re-saved word.
