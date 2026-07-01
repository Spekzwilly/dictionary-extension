-- Per-user, per-local-day review counter powering the Progress consistency graph.
-- The `day` is the user's local-clock day, passed in by the client (the DB clock is UTC).

create table if not exists public.review_activity (
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  card_count  int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.review_activity enable row level security;

create policy "Users can read own activity"
  on public.review_activity for select
  using (auth.uid() = user_id);

create policy "Users can insert own activity"
  on public.review_activity for insert
  with check (auth.uid() = user_id);

create policy "Users can update own activity"
  on public.review_activity for update
  using (auth.uid() = user_id);

-- Atomic per-card increment. Concurrent writes (two tabs) can't clobber each
-- other because the upsert adds to the current value under a row lock.
create or replace function public.increment_review_activity(p_day date)
returns void
language sql
security invoker
as $$
  insert into public.review_activity (user_id, day, card_count, updated_at)
  values (auth.uid(), p_day, 1, now())
  on conflict (user_id, day)
  do update set card_count = review_activity.card_count + 1,
                updated_at = now();
$$;
