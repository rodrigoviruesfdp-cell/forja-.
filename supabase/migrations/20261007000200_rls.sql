-- =============================================================================
-- Row Level Security
--
-- Every table has RLS enabled. Only the "authenticated" role gets policies, and
-- each policy limits rows to the caller (auth.uid()). The anonymous role gets no
-- access at all. `(select auth.uid())` is used instead of `auth.uid()` so Postgres
-- evaluates it once per query instead of once per row.
--
-- Hard deletes are not granted: the app soft-deletes (deleted_at) so deletions
-- sync between devices. Deleting the auth user still cascades everything.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;
alter table public.body_metrics enable row level security;
alter table public.goals enable row level security;

-- Explicit table privileges: nothing for anon, no DELETE for authenticated.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'exercises', 'routines', 'routine_days', 'routine_exercises',
    'sessions', 'session_exercises', 'session_sets', 'body_metrics', 'goals'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;

-- An exercise can be referenced only if the caller can see it (catalog or own).
create or replace function public.can_use_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_exercise_id is null or exists (
    select 1
    from public.exercises e
    where e.id = p_exercise_id
      and (e.created_by is null or e.created_by = (select auth.uid()))
  );
$$;

-- profiles --------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- exercises: everyone signed in reads the catalog; custom ones are private -----
create policy "exercises: read catalog and own" on public.exercises
  for select to authenticated
  using (created_by is null or created_by = (select auth.uid()));
create policy "exercises: insert own" on public.exercises
  for insert to authenticated
  with check (created_by = (select auth.uid()) and source_id is null);
create policy "exercises: update own" on public.exercises
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()) and source_id is null);

-- Generic owner policies for the rest ------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['routines', 'routine_days', 'sessions', 'session_sets', 'body_metrics']
  loop
    execute format(
      'create policy "%1$s: read own" on public.%1$I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: insert own" on public.%1$I
         for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Tables that reference exercises also check the exercise is visible ----------
do $$
declare
  t text;
begin
  foreach t in array array['routine_exercises', 'session_exercises', 'goals']
  loop
    execute format(
      'create policy "%1$s: read own" on public.%1$I
         for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: insert own" on public.%1$I
         for insert to authenticated
         with check (user_id = (select auth.uid()) and public.can_use_exercise(exercise_id))', t);
    execute format(
      'create policy "%1$s: update own" on public.%1$I
         for update to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()) and public.can_use_exercise(exercise_id))', t);
  end loop;
end;
$$;
