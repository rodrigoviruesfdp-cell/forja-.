-- =============================================================================
-- Entrega 1.9: progress photos (see docs/DECISIONES.md, "Fotos de progreso").
--
--   * media: one table for every photo the app keeps (progress photos now;
--     avatars and post copies in Fase 3). The row says where the file is and
--     what it shows; the file itself lives in Storage.
--   * Storage bucket "media": private. Each user has a folder named after their
--     id and can only read and write inside it. Nothing here is public: a photo
--     only leaves your folder if you share the image yourself.
--   * The app strips the photo's metadata (GPS, camera) and shrinks it on the
--     phone before uploading, and keeps a small thumbnail for the grid.
-- =============================================================================

create table public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('progress', 'avatar', 'post')),
  -- "<user id>/progress/<media id>.jpg": always inside the owner's folder.
  storage_path text not null check (split_part(storage_path, '/', 1) = user_id::text),
  thumb_path text check (thumb_path is null or split_part(thumb_path, '/', 1) = user_id::text),
  taken_at date not null,
  pose text check (pose in ('front', 'side', 'back')),
  width integer check (width > 0 and width <= 10000),
  height integer check (height > 0 and height <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index media_user_updated_idx on public.media (user_id, updated_at);
create index media_user_taken_idx on public.media (user_id, taken_at);

create trigger set_updated_at before insert or update on public.media
  for each row execute function public.set_updated_at();

alter table public.media enable row level security;
revoke all on public.media from anon, authenticated;
grant select, insert, update on public.media to authenticated;

create policy "media: read own" on public.media
  for select to authenticated using (user_id = (select auth.uid()));
create policy "media: insert own" on public.media
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "media: update own" on public.media
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Storage ----------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "media files: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media files: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media files: replace in own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Deleting a photo really deletes the file.
create policy "media files: delete in own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
