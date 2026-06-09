create table if not exists public.vocab_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  word        text not null,
  definition  jsonb not null,
  encounters  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint vocab_entries_user_word_unique unique (user_id, word)
);

alter table public.vocab_entries enable row level security;

create policy "Users can read own entries"
  on public.vocab_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.vocab_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.vocab_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.vocab_entries for delete
  using (auth.uid() = user_id);
