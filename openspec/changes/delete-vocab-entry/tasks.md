## 1. Vocab bank page lists and searches saved words — delete an entry

- [x] 1.1 Add an always-visible delete control to each `WordRow` in `packages/web/src/pages/VocabPage.tsx`, rendered as an inline trash SVG, red by default and heavier red on hover. Verify by opening `/vocab` and confirming the control appears on every row without expanding it.
- [x] 1.2 Wire the control to a `confirm()` guard naming the word; on cancel nothing happens. Verify by cancelling the prompt and confirming the entry stays and no network request fires.
- [x] 1.3 On confirm, delete the `vocab_entries` row by `word` (RLS scopes to the signed-in user) and optimistically remove it from the `words` state. Verify by confirming a delete and seeing the word vanish from the list immediately, and that it stays gone after reload.
- [x] 1.4 On a Supabase delete error, show an alert and restore the list via refetch so the entry reappears. Verify by simulating a failed delete (e.g. offline) and confirming the alert shows and the row returns.

## 2. Validate

- [x] 2.1 Build the web package (`npm run build --workspace=@dictionary/web`) with no type errors, and verify the modified "Vocab bank page lists and searches saved words" requirement — every delete scenario in `web-app` spec holds.
