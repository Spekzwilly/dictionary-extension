## Why

Review sessions are ephemeral — nothing about a user's practice is persisted, so users have no way to see whether they're keeping up their review habit. A GitHub-style consistency graph turns invisible effort into a visible streak, giving users a reason to come back and review daily.

## What Changes

- Persist review activity: every card the user rates increments a per-day counter (a new `review_activity` store), bucketed by the user's local-clock day.
- Add a new `/progress` route in the web app showing a trailing ~12-month GitHub-style contribution grid, shaded by cards-reviewed-that-day, plus current streak and longest streak (both derived client-side from the day rows).
- Add a **Progress** link to the Vocab Bank header (beside **Review →**) and back-links on the new page.
- Empty state: render the blank 12-month grid with a nudge to start reviewing.

## Non-Goals

- **Per-word review history / spaced-repetition scheduling / "words to strengthen" ranking.** These need an event-level store (one row per rating); the daily counter deliberately does not capture ratings. Designed as a separate future feature (see ADR-0002).
- **Session-complete streak celebration** on `/review` and an **extension-popup Progress button.** Nice later, out of scope for v1.
- **Relative/quartile color shading.** v1 uses fixed intensity buckets, tunable after real data.

## Capabilities

### New Capabilities

- `review-progress`: Persisting per-day review activity (local-clock day buckets, atomic per-card increment, per-user RLS) and the `/progress` surface that renders it as a trailing-12-month consistency graph with current + longest streak.

### Modified Capabilities

(none — review-session and web-app are consumed, not changed at the requirement level; the graph reads activity and adds a route without altering existing review or auth behavior)

## Impact

- **New Supabase migration:** `review_activity(user_id, day, card_count)`, unique `(user_id, day)`, per-user RLS (`auth.uid() = user_id`), plus an atomic increment (`insert … on conflict do update set card_count = card_count + 1`).
- **Affected code:**
  - `packages/web/src/pages/ReviewPage.tsx` — increment activity on each card rate.
  - `packages/web/src/pages/ProgressPage.tsx` — new page (grid + streaks + empty state).
  - `packages/web/src/App.tsx` — new guarded `/progress` route.
  - `packages/web/src/pages/VocabPage.tsx` — add Progress header link.
  - `supabase/migrations/` — new migration file.
  - Possibly `packages/shared/` — streak-from-days helper if shared logic is warranted.
