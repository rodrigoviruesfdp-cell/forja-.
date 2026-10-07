-- =============================================================================
-- Core schema (Fase 1)
--
-- Conventions (see docs/DECISIONES.md):
--   * Every user-owned table has user_id (default auth.uid()) and RLS.
--   * Child tables carry user_id too and reference their parent through a
--     composite FK (parent_id, user_id) -> parent(id, user_id), so a row can
--     never point at another user's parent.
--   * Rows are never hard-deleted by the app: deleted_at marks a soft delete so
--     the deletion can be synced to other devices.
--   * updated_at is always assigned by the server (trigger). Clients use it as
--     the incremental sync cursor.
--   * Weights are stored in kg, distances in km. Weekdays: 0 = Monday ... 6 = Sunday.
--   * Enumerations are text + CHECK (easy to extend in later migrations).
-- =============================================================================

-- updated_at is server-assigned on every insert and update -----------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- exercises: shared catalog (created_by is null) + user custom exercises
-- -----------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete cascade,
  -- Stable id from the source dataset (free-exercise-db), used to re-run the seed idempotently.
  source_id text unique,
  name text not null check (char_length(name) between 1 and 120),
  -- {"es": {"name": "...", "instructions": ["..."]}}
  translations jsonb not null default '{}'::jsonb,
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  equipment text,
  category text,
  mechanic text check (mechanic in ('compound', 'isolation')),
  instructions text[] not null default '{}',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index exercises_created_by_idx on public.exercises (created_by);
create index exercises_updated_at_idx on public.exercises (updated_at);

-- -----------------------------------------------------------------------------
-- routines: a routine is either a fixed weekly plan or an ordered rotation
-- (A/B/C/D...). Gym and sport days live in routine_days.
-- -----------------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  -- weekly:   every routine_day has a weekday.
  -- rotation: gym days have no weekday and are done in order (A, B, C, D, A...);
  --           sport days may still be pinned to a weekday.
  schedule_type text not null default 'weekly' check (schedule_type in ('weekly', 'rotation')),
  -- Rotation only: weekdays on which the next rotation day is projected in the calendar.
  training_weekdays smallint[] not null default '{}'
    check (training_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  -- Sessions per week that count as a "fulfilled" week for the streak. Null = derived from the routine.
  weekly_target smallint check (weekly_target between 1 and 14),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create index routines_user_updated_idx on public.routines (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- profiles: one row per auth user (id = auth.users.id)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  goal text check (goal in ('strength', 'hypertrophy', 'health', 'mixed')),
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  units text not null default 'kg' check (units in ('kg', 'lb')),
  locale text not null default 'es' check (locale in ('es', 'en')),
  injury_notes text,
  -- The single active routine lives here so "only one active" is guaranteed by construction.
  active_routine_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (active_routine_id, id) references public.routines (id, user_id)
    on delete set null (active_routine_id)
);

-- -----------------------------------------------------------------------------
-- routine_days: one entry of a routine (a gym day like "A" / "Pierna", or a sport)
-- -----------------------------------------------------------------------------
create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'gym' check (kind in ('gym', 'sport')),
  sport text check (char_length(sport) <= 60),
  -- 0 = Monday ... 6 = Sunday. Required for weekly routines (enforced in the app),
  -- optional in rotations (pins a sport to a fixed day).
  weekday smallint check (weekday between 0 and 6),
  position smallint not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  check (kind <> 'sport' or sport is not null),
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade
);

create index routine_days_routine_idx on public.routine_days (routine_id);
create index routine_days_user_updated_idx on public.routine_days (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- routine_exercises: exercises planned for a gym routine day
-- -----------------------------------------------------------------------------
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_day_id uuid not null,
  exercise_id uuid not null references public.exercises (id),
  position smallint not null default 0,
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  -- Rep range for double progression (8-12). Fixed reps: target_reps_max is null.
  target_reps_min smallint not null default 8 check (target_reps_min between 1 and 100),
  target_reps_max smallint check (target_reps_max between 1 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  check (target_reps_max is null or target_reps_max >= target_reps_min),
  foreign key (routine_day_id, user_id) references public.routine_days (id, user_id) on delete cascade
);

create index routine_exercises_day_idx on public.routine_exercises (routine_day_id);
create index routine_exercises_exercise_idx on public.routine_exercises (exercise_id);
create index routine_exercises_user_updated_idx on public.routine_exercises (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- sessions: one workout (gym) or one sport activity. Several per day allowed.
-- Planned sessions are NOT stored per day: the calendar projects them from the
-- active routine. A row is created when a session starts, is logged or skipped.
-- -----------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  kind text not null default 'gym' check (kind in ('gym', 'sport')),
  routine_day_id uuid,
  -- Snapshot of the routine day name (history survives renames/deletes).
  title text check (char_length(title) <= 80),
  sport text check (char_length(sport) <= 60),
  duration_min smallint check (duration_min between 0 and 1440),
  rpe smallint check (rpe between 1 and 10),
  distance_km numeric(7, 2) check (distance_km >= 0),
  notes text,
  status text not null default 'completed'
    check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  -- Reserved for the social phase. Only 'private' is used for now.
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'public')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  check (kind <> 'sport' or sport is not null),
  check (ended_at is null or started_at is null or ended_at >= started_at),
  foreign key (routine_day_id, user_id) references public.routine_days (id, user_id)
    on delete set null (routine_day_id)
);

create index sessions_user_date_idx on public.sessions (user_id, date);
create index sessions_user_updated_idx on public.sessions (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- session_exercises: exercises performed in a session, in order, with notes and
-- a snapshot of the targets (editing the routine later does not rewrite history).
-- -----------------------------------------------------------------------------
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null references public.exercises (id),
  routine_exercise_id uuid,
  position smallint not null default 0,
  target_sets smallint check (target_sets between 1 and 20),
  target_reps_min smallint check (target_reps_min between 1 and 100),
  target_reps_max smallint check (target_reps_max between 1 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (session_id, user_id) references public.sessions (id, user_id) on delete cascade,
  foreign key (routine_exercise_id, user_id) references public.routine_exercises (id, user_id)
    on delete set null (routine_exercise_id)
);

create index session_exercises_session_idx on public.session_exercises (session_id);
create index session_exercises_exercise_idx on public.session_exercises (user_id, exercise_id);
create index session_exercises_user_updated_idx on public.session_exercises (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- session_sets: each logged set
-- -----------------------------------------------------------------------------
create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null,
  set_number smallint not null check (set_number between 1 and 100),
  weight_kg numeric(7, 3) not null default 0 check (weight_kg >= 0 and weight_kg < 10000),
  reps smallint not null check (reps between 0 and 1000),
  rpe numeric(3, 1) check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  -- Cached flag, recomputed by the app whenever sets of the exercise change.
  is_pr boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (session_exercise_id, user_id) references public.session_exercises (id, user_id)
    on delete cascade
);

create index session_sets_session_exercise_idx on public.session_sets (session_exercise_id);
create index session_sets_user_updated_idx on public.session_sets (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- body_metrics (no UI in Fase 1)
-- -----------------------------------------------------------------------------
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  body_weight_kg numeric(6, 2) check (body_weight_kg > 0 and body_weight_kg < 1000),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index body_metrics_user_date_idx on public.body_metrics (user_id, date);
create index body_metrics_user_updated_idx on public.body_metrics (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- goals (no UI in Fase 1)
-- -----------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 280),
  exercise_id uuid references public.exercises (id),
  target_value numeric(9, 3),
  deadline date,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index goals_user_updated_idx on public.goals (user_id, updated_at);

-- updated_at triggers ----------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'exercises', 'routines', 'profiles', 'routine_days', 'routine_exercises',
    'sessions', 'session_exercises', 'session_sets', 'body_metrics', 'goals'
  ]
  loop
    execute format(
      'create trigger set_updated_at before insert or update on public.%I
         for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;
