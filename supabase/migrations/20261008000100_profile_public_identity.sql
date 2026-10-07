-- =============================================================================
-- Public identity for the future social features (Fase 3). Stored now so the
-- user can reserve a username; nothing is exposed publicly yet (profiles RLS
-- still only lets each user read their own row). See docs/SOCIAL.md.
-- =============================================================================

alter table public.profiles
  add column username text,
  add column bio text check (char_length(bio) <= 280),
  add column avatar_url text,
  -- Private by default: nothing will be visible to others until the user opts in.
  add column is_private boolean not null default true;

alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[a-z0-9_.]{3,30}$');

create unique index profiles_username_key on public.profiles (username);
