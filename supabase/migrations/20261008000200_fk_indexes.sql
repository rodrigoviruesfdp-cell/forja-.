-- Indexes covering every foreign key (Supabase performance advisor 0001).
-- They keep cascades and parent lookups fast as the history grows.
create index routine_days_routine_user_idx on public.routine_days (routine_id, user_id);
create index routine_exercises_day_user_idx on public.routine_exercises (routine_day_id, user_id);
create index session_exercises_session_user_idx on public.session_exercises (session_id, user_id);
create index session_exercises_routine_exercise_idx on public.session_exercises (routine_exercise_id, user_id);
create index session_exercises_exercise_id_idx on public.session_exercises (exercise_id);
create index session_sets_session_exercise_user_idx on public.session_sets (session_exercise_id, user_id);
create index sessions_routine_day_idx on public.sessions (routine_day_id, user_id);
create index goals_exercise_idx on public.goals (exercise_id);
create index profiles_active_routine_idx on public.profiles (active_routine_id, id);
