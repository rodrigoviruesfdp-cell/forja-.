-- =============================================================================
-- Create a profile automatically for every auth user.
-- Public sign-ups are disabled in the dashboard; the only user is created there.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: the user may have been created before this migration ran.
insert into public.profiles (id, display_name)
select u.id, split_part(coalesce(u.email, ''), '@', 1)
from auth.users u
on conflict (id) do nothing;
