-- =============================================================================
-- Entrega 1.5: sports logged by hand, with where and how (see docs/DECISIONES.md).
--
--   * places: each user's own list of spots (a surf break, a climbing gym, a
--     boxing club...). Only a name for now; coordinates can be added later
--     without touching existing rows.
--   * sessions.place_id: where a session happened (composite FK, so it can only
--     point at one of the owner's places).
--   * sessions.metrics: what each sport counts (waves, rounds, routes...), as a
--     flat JSON object. The app validates the keys per sport, so a new sport or
--     metric never needs a column.
-- =============================================================================

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- The sport it was created for (a code from the app's catalogue, or custom text);
  -- only used to list the right spots first.
  sport text check (char_length(sport) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create index places_user_updated_idx on public.places (user_id, updated_at);

create trigger set_updated_at before insert or update on public.places
  for each row execute function public.set_updated_at();

alter table public.places enable row level security;
revoke all on public.places from anon, authenticated;
grant select, insert, update on public.places to authenticated;

create policy "places: read own" on public.places
  for select to authenticated using (user_id = (select auth.uid()));
create policy "places: insert own" on public.places
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "places: update own" on public.places
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.sessions
  add column place_id uuid,
  add column metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  add foreign key (place_id, user_id) references public.places (id, user_id) on delete set null (place_id);

create index sessions_place_idx on public.sessions (place_id, user_id);
