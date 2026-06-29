## Why

Words land in the vocab bank by accident — a misclicked Save in the extension, a stray Raycast capture. Today there is no way to remove them; the bank only grows. Users need to delete an entry to keep the bank clean.

## What Changes

- Add a delete control to each word row on the web app vocab bank page (`/vocab`).
- Deleting removes the whole `vocab_entries` row for that word (definition + all encounters), scoped to the signed-in user.
- A native `confirm()` guards the action before it runs.
- The list updates optimistically; on a delete error the row is restored and an alert is shown.
- No database migration — the per-user DELETE RLS policy already exists on `vocab_entries`.

## Non-Goals

- **No delete in the extension popup or Raycast.** Those surfaces are capture-only; the web app is the canonical bank UI.
- **No per-encounter delete.** Deletion is whole-entry only. Splicing a single encounter out of a multi-encounter word is out of scope.
- **No undo / soft-delete / toast infrastructure.** A blocking `confirm()` is the only safety guard; the delete is a hard delete.
- **No new icon dependency.** The trash icon is an inline SVG matching the existing PronounceButton pattern.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `web-app`: the "Vocab bank page lists and searches saved words" requirement gains the ability to delete an entry from a word row.

## Impact

- Affected specs: `web-app`
- Affected code: `packages/web/src/pages/VocabPage.tsx` (delete handler + trash control on `WordRow`)
- No DB change: `supabase/migrations/0001_vocab_entries.sql` already defines the DELETE RLS policy.
