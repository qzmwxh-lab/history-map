-- Keep the historical-point table aligned with the public and admin clients.
-- Safe to run more than once on an existing project.
begin;

alter table public.missionary_points
  add column if not exists n_en text,
  add column if not exists w_en text,
  add column if not exists d_en text,
  add column if not exists created_by uuid references auth.users(id) default auth.uid();

create index if not exists missionary_points_created_by_idx
  on public.missionary_points(created_by);

commit;

notify pgrst, 'reload schema';
