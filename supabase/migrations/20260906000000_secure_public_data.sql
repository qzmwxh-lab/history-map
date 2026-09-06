-- Reproducible schema and least-privilege policies for the browser clients.
-- Promote an administrator by setting auth.users.raw_app_meta_data.role = 'admin'
-- with a trusted server/Admin API. Never let clients write app_metadata.
begin;

-- Existing permissive policies OR together. Refuse to silently preserve an
-- unknown policy which could bypass these rules; review the live schema first.
do $$
begin
  if exists (
    select 1 from pg_policies
    where (schemaname = 'public'
      and tablename in ('missionary_points','vr_works','vr_scenes','vr_hotspots'))
      or (schemaname = 'storage' and tablename = 'objects')
  ) then
    raise exception 'Existing RLS policies detected. Review and replace them explicitly before applying this migration.';
  end if;
end $$;

create or replace function public.is_history_map_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

alter table if exists public.missionary_points enable row level security;
alter table if exists public.vr_works enable row level security;
alter table if exists public.vr_scenes enable row level security;
alter table if exists public.vr_hotspots enable row level security;

alter table if exists public.missionary_points
  add column if not exists created_by uuid references auth.users(id) default auth.uid();

create index if not exists missionary_points_status_year_idx on public.missionary_points(status, y);
create index if not exists missionary_points_created_by_idx on public.missionary_points(created_by);
create index if not exists vr_scenes_work_sort_idx on public.vr_scenes(work_id, sort_order);
create index if not exists vr_hotspots_scene_idx on public.vr_hotspots(scene_id);

revoke all on table public.missionary_points from anon, authenticated;
grant select on table public.missionary_points to anon, authenticated;
grant insert, update, delete on table public.missionary_points to authenticated;

revoke all on table public.vr_works, public.vr_scenes, public.vr_hotspots from anon, authenticated;
grant select on table public.vr_works, public.vr_scenes, public.vr_hotspots to anon, authenticated;
grant insert, update, delete on table public.vr_works, public.vr_scenes, public.vr_hotspots to authenticated;

-- Public visitors receive approved historical points only.
drop policy if exists "public reads approved points" on public.missionary_points;
create policy "public reads approved points"
on public.missionary_points for select
to anon, authenticated
using (status = 'approved' or public.is_history_map_admin() or created_by = auth.uid());

-- Members can submit pending records and manage only their own pending records.
drop policy if exists "members submit pending points" on public.missionary_points;
create policy "members submit pending points"
on public.missionary_points for insert
to authenticated
with check (
  public.is_history_map_admin()
  or (created_by = auth.uid() and status = 'pending')
);

drop policy if exists "members update own pending points" on public.missionary_points;
create policy "members update own pending points"
on public.missionary_points for update
to authenticated
using (public.is_history_map_admin() or (created_by = auth.uid() and status = 'pending'))
with check (public.is_history_map_admin() or (created_by = auth.uid() and status = 'pending'));

drop policy if exists "admins delete points" on public.missionary_points;
create policy "admins delete points"
on public.missionary_points for delete
to authenticated
using (public.is_history_map_admin());

-- VR content is public to view; only administrators can mutate it.
drop policy if exists "public reads vr works" on public.vr_works;
create policy "public reads vr works" on public.vr_works for select to anon, authenticated using (true);
drop policy if exists "admins write vr works" on public.vr_works;
create policy "admins write vr works" on public.vr_works for all to authenticated
using (public.is_history_map_admin()) with check (public.is_history_map_admin());

drop policy if exists "public reads vr scenes" on public.vr_scenes;
create policy "public reads vr scenes" on public.vr_scenes for select to anon, authenticated using (true);
drop policy if exists "admins write vr scenes" on public.vr_scenes;
create policy "admins write vr scenes" on public.vr_scenes for all to authenticated
using (public.is_history_map_admin()) with check (public.is_history_map_admin());

drop policy if exists "public reads vr hotspots" on public.vr_hotspots;
create policy "public reads vr hotspots" on public.vr_hotspots for select to anon, authenticated using (true);
drop policy if exists "admins write vr hotspots" on public.vr_hotspots;
create policy "admins write vr hotspots" on public.vr_hotspots for all to authenticated
using (public.is_history_map_admin()) with check (public.is_history_map_admin());

-- Storage limits are enforced by the bucket as well as by the browser UI.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('history-media', 'history-media', true, 209715200,
    array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','video/mp4','video/webm','application/pdf']),
  ('vr-media', 'vr-media', true, 209715200,
    array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads history media" on storage.objects;
create policy "public reads history media" on storage.objects for select to anon, authenticated
using (bucket_id in ('history-media', 'vr-media'));

drop policy if exists "admins write history media" on storage.objects;
create policy "admins write history media" on storage.objects for all to authenticated
using (bucket_id in ('history-media', 'vr-media') and public.is_history_map_admin())
with check (bucket_id in ('history-media', 'vr-media') and public.is_history_map_admin());

drop policy if exists "members upload own history media" on storage.objects;
create policy "members upload own history media" on storage.objects for insert to authenticated
with check (
  bucket_id = 'history-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "members delete own history media" on storage.objects;
create policy "members delete own history media" on storage.objects for delete to authenticated
using (
  bucket_id = 'history-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
commit;
