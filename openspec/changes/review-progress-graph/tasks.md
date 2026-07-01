## 1. Persistence layer

- [x] 1.1 Satisfy **Review activity increments are atomic and per-user isolated**: add a Supabase migration creating `review_activity(user_id uuid, day date, card_count int, ...)` with unique `(user_id, day)` and per-user RLS (`auth.uid() = user_id`). Verified by applying the migration locally and confirming a non-owner `select` returns zero rows.
- [x] 1.2 Also for **Review activity increments are atomic and per-user isolated**: add an atomic increment path — a Postgres function (or `insert … on conflict do update set card_count = review_activity.card_count + 1`) callable from the web app. Verified by calling it twice for the same day and asserting `card_count` = 2.
- [x] 1.3 Satisfy **Review activity is persisted per local-clock day**: `ReviewPage.tsx` calls the increment for the user's local-clock day on every card rate (including abandoned sessions). Verified manually by rating cards and observing the correct `(day, card_count)` row in Supabase, including a late-night (local-tz) rate landing on the local day.

## 2. Progress surface

- [x] 2.1 Add a guarded `/progress` route in `App.tsx` that redirects unauthenticated users to `/login`. Verified by visiting `/progress` signed-out (redirects) and signed-in (renders).
- [x] 2.2 Satisfy **Progress page shows a trailing 12-month consistency graph**: `ProgressPage.tsx` fetches the user's `review_activity` rows and renders a trailing 53-week × 7-day grid, cells lit/blank by activity and shaded by fixed intensity buckets (blank · 1–4 · 5–9 · 10–19 · 20+). Verified against seeded rows: a 3-card day shows level 1, a 25-card day shows level 4, a zero day is blank.
- [x] 2.3 Satisfy **Progress page shows current and longest streak**: compute and display current streak and longest streak from the day rows (current alive through today; any fully-missed day breaks a run). Verified by a unit test of the streak function against the spec example (current=3, longest=10) plus edge cases (no reviews today, single day, all-empty).
- [x] 2.4 Satisfy **Progress page has an inviting empty state**: with zero activity, show the full blank grid plus a prompt linking to `/review`. Verified manually with a fresh account.

## 3. Navigation

- [x] 3.1 Satisfy **Progress page is reachable from the vocab bank**: add a **Progress** link to the Vocab Bank header beside **Review →** (`VocabPage.tsx`), and a back-link from `ProgressPage.tsx` to `/vocab`. Verified by navigating vocab → progress → vocab in the browser.

## 4. Verification

- [x] 4.1 `npm run build` passes for `@dictionary/web` (and `@dictionary/shared` if a streak helper is added there). Verified by a clean build with no type errors.
