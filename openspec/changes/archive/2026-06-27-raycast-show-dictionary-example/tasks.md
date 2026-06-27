## 1. Drop the typed-sentence form

- [x] 1.1 The Add Vocab command no longer offers an "Add with sentence…" action and no longer defines a `SentenceForm`; verify by grepping `packages/raycast/src/add-vocab.tsx` for `SentenceForm`/`Add with Sentence` (no matches) and confirming the Save action calls `saveAndRefresh(definition)` with no sentence argument.
- [x] 1.2 Unused imports are removed (`Form`, `useNavigation`, and any now-unused `Icon` member); verify with `npm run build --workspace=dictionary-vocab` (`tsc --noEmit`) reporting no unused-symbol or type errors.

## 2. Simplify the save contract (Add Vocab saves to the shared vocab bank)

- [x] 2.1 Satisfying the "Add Vocab saves to the shared vocab bank" requirement, `saveWord` takes only a definition and records a `raycast://manual` encounter with no `sentence` field; verify by reading `packages/raycast/src/lib/vocab.ts` (signature is `saveWord(definition: WordDefinition)`, encounter omits `sentence`) and confirming `tsc --noEmit` passes for the whole repo via `npm run build`.

## 3. Confirm preview unchanged

- [x] 3.1 The Add Vocab preview still renders the dictionary `definition.example` when present; verify `renderPreview` in `packages/raycast/src/add-vocab.tsx` still emits the `> ${d.example}` blockquote and that a manual run of `cd packages/raycast && npm run dev` shows the example line for a word that has one (e.g. "ephemeral").
