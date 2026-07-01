# Persist review activity as a daily counter, not a per-review event log

The Progress graph needs only *(day → count of Card Reviews)*. We store exactly that: one row per user per Review-Day with a card count, incremented atomically as cards are rated. We rejected an event log (one row per Card Review, carrying word + rating + timestamp) because it is speculative infrastructure — the graph never needs per-word or per-rating detail, and 10 rows per session buys nothing today.

## Considered Options

- **Daily counter (chosen).** Tiny table, trivial graph query, one small write per rated card.
- **Event log (rejected for now).** Would enable future features (per-word review history, spaced-repetition scheduling, "words to strengthen" ranking) without a migration.

## Consequences

- Future features that need per-word rating history (e.g. the "words to strengthen" ranking discussed) are **not** unlocked by this table. When built, they add their own event-level store and start persisting ratings — a separate, deliberately-designed feature, not a retrofit of this counter.
- No historical ratings are captured in the meantime; that data is unrecoverable for days that pass before an event log exists. Accepted, because pre-building the log blind would likely mis-model the eventual SRS.
- The increment must be an atomic upsert (`insert … on conflict do update set card_count = card_count + 1`) so two open tabs cannot clobber each other's count.
