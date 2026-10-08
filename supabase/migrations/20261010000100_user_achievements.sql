-- =============================================================================
-- Entrega 1.7: achievements (see docs/LOGROS.md).
--
-- The achievements themselves (what counts, the levels) live in the app's code;
-- the database only remembers which level of which achievement you unlocked,
-- when, and with which session. Progress ("146/200") is never stored: the app
-- recomputes it from your sessions.
--
--   * One row per achievement and level. The app derives the id from
--     (user, achievement, level), so computing the same unlock on two phones
--     writes the same row instead of a duplicate.
--   * Unlocks are never deleted (no DELETE grant): deleting sessions does not
--     take an achievement away.
--   * seen_at: the unlock animation shows once, on any phone.
--   * featured_position: its place in the highlights under your profile.
-- =============================================================================

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  achievement_key text not null check (achievement_key ~ '^[a-z0-9_]{1,60}$'),
  tier smallint not null check (tier between 1 and 20),
  unlocked_at timestamptz not null,
  session_id uuid,
  seen_at timestamptz,
  featured_position smallint check (featured_position between 0 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, achievement_key, tier),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete set null (session_id)
);

create index user_achievements_user_updated_idx on public.user_achievements (user_id, updated_at);
create index user_achievements_session_idx on public.user_achievements (session_id, user_id);

create trigger set_updated_at before insert or update on public.user_achievements
  for each row execute function public.set_updated_at();

alter table public.user_achievements enable row level security;
revoke all on public.user_achievements from anon, authenticated;
grant select, insert, update on public.user_achievements to authenticated;

create policy "user_achievements: read own" on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_achievements: insert own" on public.user_achievements
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_achievements: update own" on public.user_achievements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
