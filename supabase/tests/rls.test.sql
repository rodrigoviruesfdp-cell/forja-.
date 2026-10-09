-- RLS and integrity tests. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(48);

-- Fixtures (as postgres, RLS bypassed) -----------------------------------------
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'authenticated', 'authenticated');

insert into public.exercises (id, name, primary_muscle, source_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Bench Press', 'chest', 'Barbell_Bench_Press');

insert into public.exercises (id, name, primary_muscle, created_by)
values ('bbbbbbbb-0000-0000-0000-000000000002', 'Bob secret curl', 'biceps', '22222222-2222-2222-2222-222222222222');

insert into public.routines (id, user_id, name)
values ('bbbbbbbb-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'Bob routine');

select is(
  (select count(*)::int from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2,
  'a profile is created for every auth user'
);

-- Act as Ana ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*)::int from public.profiles),
  1,
  'Ana only sees her own profile'
);

select is(
  (select count(*)::int from public.exercises
   where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')),
  1,
  'Ana sees the catalog but not Bob''s custom exercise'
);

select is(
  (select count(*)::int from public.routines),
  0,
  'Ana cannot see Bob''s routines'
);

select lives_ok(
  $$ insert into public.routines (id, name, schedule_type)
     values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Ana A/B/C/D', 'rotation') $$,
  'Ana can create a routine (user_id defaults to auth.uid())'
);

select is(
  (select user_id from public.routines where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaulted to the caller'
);

select throws_ok(
  $$ insert into public.routines (name, user_id)
     values ('Forged', '22222222-2222-2222-2222-222222222222') $$,
  '42501',
  null,
  'Ana cannot create rows for Bob'
);

select throws_ok(
  $$ insert into public.routine_days (routine_id, name)
     values ('bbbbbbbb-0000-0000-0000-00000000000a', 'A') $$,
  '23503',
  null,
  'Ana cannot attach a day to Bob''s routine (composite FK)'
);

select lives_ok(
  $$ insert into public.routine_days (id, routine_id, name, position)
     values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-00000000000a', 'A', 0) $$,
  'Ana can add a day to her routine'
);

select lives_ok(
  $$ insert into public.routine_days (routine_id, name, kind, sport, weekday, position)
     values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Fútbol', 'sport', 'football', 2, 4) $$,
  'Ana can pin a sport day to a weekday inside a rotation'
);

select throws_ok(
  $$ insert into public.routine_days (routine_id, name, kind)
     values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Sport without name', 'sport') $$,
  '23514',
  null,
  'a sport day requires the sport'
);

select lives_ok(
  $$ insert into public.routine_exercises (routine_day_id, exercise_id, target_sets, target_reps_min, target_reps_max)
     values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-000000000001', 4, 8, 12) $$,
  'Ana can plan a catalog exercise'
);

select throws_ok(
  $$ insert into public.routine_exercises (routine_day_id, exercise_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'bbbbbbbb-0000-0000-0000-000000000002') $$,
  '42501',
  null,
  'Ana cannot reference Bob''s private exercise'
);

select throws_ok(
  $$ insert into public.routine_exercises (routine_day_id, exercise_id, target_reps_min, target_reps_max)
     values ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-000000000001', 12, 8) $$,
  '23514',
  null,
  'rep range must be ordered'
);

select throws_ok(
  $$ insert into public.exercises (name, primary_muscle) values ('Fake catalog', 'chest') $$,
  '42501',
  null,
  'Ana cannot add exercises to the shared catalog'
);

select lives_ok(
  $$ insert into public.exercises (name, primary_muscle, created_by)
     values ('Ana hip thrust', 'glutes', '11111111-1111-1111-1111-111111111111') $$,
  'Ana can create a custom exercise'
);

update public.exercises set name = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select name from public.exercises where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Bench Press',
  'Ana cannot modify catalog exercises'
);

select throws_ok(
  $$ delete from public.routines where id = 'aaaaaaaa-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'hard deletes are not allowed (soft delete only)'
);

select lives_ok(
  $$ update public.profiles
     set active_routine_id = 'aaaaaaaa-0000-0000-0000-00000000000a', units = 'lb', locale = 'en'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'Ana can activate her routine and change units/locale'
);

select throws_ok(
  $$ update public.profiles
     set active_routine_id = 'bbbbbbbb-0000-0000-0000-00000000000a'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23503',
  null,
  'Ana cannot activate Bob''s routine'
);

-- Sessions and sets -----------------------------------------------------------------
select lives_ok(
  $$ insert into public.sessions (id, date, kind, routine_day_id, title, status, started_at)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', current_date, 'gym',
             'aaaaaaaa-0000-0000-0000-0000000000d1', 'A', 'in_progress', now()) $$,
  'Ana can start a gym session'
);

select lives_ok(
  $$ insert into public.session_exercises (id, session_id, exercise_id, position)
     values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-0000000000e1',
             'aaaaaaaa-0000-0000-0000-000000000001', 0) $$,
  'Ana can add an exercise to her session'
);

select lives_ok(
  $$ insert into public.session_sets (id, session_exercise_id, set_number, weight_kg, reps, updated_at)
     values ('aaaaaaaa-0000-0000-0000-0000000000e3', 'aaaaaaaa-0000-0000-0000-0000000000e2',
             1, 102.058, 8, '2000-01-01') $$,
  'Ana can log a set'
);

select ok(
  (select updated_at > now() - interval '1 minute'
   from public.session_sets where id = 'aaaaaaaa-0000-0000-0000-0000000000e3'),
  'updated_at is always assigned by the server'
);

select lives_ok(
  $$ insert into public.sessions (date, kind, sport, duration_min, rpe, distance_km)
     values (current_date, 'sport', 'football', 90, 7, 8.5) $$,
  'Ana can log a sport session the same day'
);

-- Places and sport metrics (1.5) ------------------------------------------------------
select lives_ok(
  $$ insert into public.places (id, name, sport)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Zurriola', 'surf') $$,
  'Ana can save a spot'
);

select lives_ok(
  $$ insert into public.sessions (id, date, kind, sport, duration_min, place_id, metrics)
     values ('aaaaaaaa-0000-0000-0000-0000000000f2', current_date - 3, 'sport', 'surf', 120,
             'aaaaaaaa-0000-0000-0000-0000000000f1', '{"waves": 14}') $$,
  'Ana can log a past surf session at her spot with its waves'
);

select throws_ok(
  $$ insert into public.sessions (date, kind, sport, metrics)
     values (current_date, 'sport', 'surf', '[14]') $$,
  '23514',
  null,
  'metrics must be a JSON object'
);

-- Achievements (1.7) ----------------------------------------------------------------
select lives_ok(
  $$ insert into public.user_achievements (id, achievement_key, tier, unlocked_at, session_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'the_search', 1, now(), 'aaaaaaaa-0000-0000-0000-0000000000f2') $$,
  'Ana can record an unlock with the session that earned it'
);

select throws_ok(
  $$ insert into public.user_achievements (achievement_key, tier, unlocked_at)
     values ('the_search', 1, now()) $$,
  '23505',
  null,
  'the same level of an achievement is stored once'
);

select throws_ok(
  $$ insert into public.user_achievements (achievement_key, tier, unlocked_at)
     values ('The Search!', 0, now()) $$,
  '23514',
  null,
  'achievement keys are codes and levels start at 1'
);

-- Progress photos (1.9) ----------------------------------------------------------------
select lives_ok(
  $$ insert into public.media (id, kind, storage_path, thumb_path, taken_at, pose, width, height)
     values ('aaaaaaaa-0000-0000-0000-0000000000b1', 'progress',
             '11111111-1111-1111-1111-111111111111/progress/b1.jpg',
             '11111111-1111-1111-1111-111111111111/progress/b1-thumb.jpg', current_date, 'front', 1200, 1600) $$,
  'Ana can save a progress photo kept in her folder'
);

select throws_ok(
  $$ insert into public.media (kind, storage_path, taken_at)
     values ('progress', '22222222-2222-2222-2222-222222222222/progress/x.jpg', current_date) $$,
  '23514',
  null,
  'a photo row can only point inside its owner''s folder'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('media', '11111111-1111-1111-1111-111111111111/progress/b1.jpg') $$,
  'Ana can upload a file to her own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('media', '22222222-2222-2222-2222-222222222222/progress/x.jpg') $$,
  '42501',
  null,
  'Ana cannot upload to someone else''s folder'
);

-- Public identity (usernames) ----------------------------------------------------------
select lives_ok(
  $$ update public.profiles set username = 'ana.lifts', bio = 'Hola'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  'Ana can reserve a username'
);

select throws_ok(
  $$ update public.profiles set username = 'Ana Lifts!'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  null,
  'usernames are lowercase letters, digits, dots and underscores'
);

select is(
  (select is_private from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  true,
  'profiles are private by default'
);

-- Bob cannot see any of it --------------------------------------------------------------
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ update public.profiles set username = 'ana.lifts'
     where id = '22222222-2222-2222-2222-222222222222' $$,
  '23505',
  null,
  'usernames are unique'
);

select is(
  (select count(*)::int from public.sessions) + (select count(*)::int from public.session_sets)
    + (select count(*)::int from public.routine_days),
  0,
  'Bob cannot see Ana''s sessions, sets or routine days'
);

select is(
  (select count(*)::int from public.places),
  0,
  'Bob cannot see Ana''s spots'
);

select throws_ok(
  $$ insert into public.sessions (date, kind, sport, place_id)
     values (current_date, 'sport', 'surf', 'aaaaaaaa-0000-0000-0000-0000000000f1') $$,
  '23503',
  null,
  'Bob cannot log a session at Ana''s spot (composite FK)'
);

select is(
  (select count(*)::int from public.user_achievements),
  0,
  'Bob cannot see Ana''s achievements'
);

select is(
  (select count(*)::int from public.media) + (select count(*)::int from storage.objects where bucket_id = 'media'),
  0,
  'Bob cannot see Ana''s photos or their files'
);

select is(
  (select count(*)::int from storage.buckets where id = 'media' and public),
  0,
  'the photos bucket is private'
);

select throws_ok(
  $$ insert into public.user_achievements (achievement_key, tier, unlocked_at, session_id)
     values ('the_search', 1, now(), 'aaaaaaaa-0000-0000-0000-0000000000f2') $$,
  '23503',
  null,
  'Bob cannot attach an achievement to a session that is not his'
);

-- Anonymous visitors get nothing ----------------------------------------------------------
reset role;
set local role anon;

select throws_ok(
  $$ select count(*) from public.exercises $$,
  '42501',
  null,
  'anonymous users have no access at all'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'media'),
  0,
  'anonymous visitors cannot list photo files'
);

select * from finish();
rollback;
