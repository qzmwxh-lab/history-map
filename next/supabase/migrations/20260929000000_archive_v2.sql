-- REVIEW ONLY. Apply only after a verified full database/media backup and live schema audit.
-- New tables leave legacy content untouched. No legacy coordinates are implicitly trusted.
begin;
create function public.archive_role() returns text language sql stable security definer
set search_path = '' as $$
 select coalesce(raw_app_meta_data->>'role','') from auth.users where id=auth.uid()
$$;
revoke all on function public.archive_role() from public;
grant execute on function public.archive_role() to authenticated;
create table public.archive_records (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('places','people','library','routes')),
 title text not null,
 person text not null default '',
 year integer,
 summary text not null default '',
 historical_text text not null default '',
 reflection_text text not null default '',
 title_en text,
 summary_en text,
 historical_text_en text,
 reflection_text_en text,
 english_status text not null default 'untranslated' check(english_status in ('untranslated','draft','pending','published','stale')),
 source_citation text not null default '',
 legacy_reference text unique,
 status text not null default 'draft' check(status in ('draft','pending','changes_requested','approved','published','archived')),
 review_note text not null default '',
 visibility text not null default 'private' check(visibility in ('public','private')),
 coordinate_system text check(coordinate_system in ('WGS84','GCJ02','unknown')),
 original_latitude double precision check(original_latitude between -90 and 90),
 original_longitude double precision check(original_longitude between -180 and 180),
 public_latitude double precision check(public_latitude between -90 and 90),
 public_longitude double precision check(public_longitude between -180 and 180),
 location_precision text not null default 'hidden' check(location_precision in ('exact','approximate','hidden')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((public_latitude is null) = (public_longitude is null)),
 check(location_precision <> 'hidden' or (public_latitude is null and public_longitude is null)),
 check(public_latitude is null or coordinate_system = 'WGS84')
);
alter table public.archive_records enable row level security;
revoke all on public.archive_records from anon, authenticated;
grant select on public.archive_records to authenticated;
grant insert, update, delete on public.archive_records to authenticated;
create policy archive_read on public.archive_records for select using (
 (created_by=auth.uid() and public.archive_role()='contributor') or public.archive_role() in ('admin','reviewer')
);
create policy archive_insert on public.archive_records for insert to authenticated
 with check(created_by=auth.uid() and public.archive_role() in ('admin','contributor','reviewer'));
create policy archive_update on public.archive_records for update to authenticated
 using(public.archive_role()='admin' or (public.archive_role()='reviewer' and (status in ('pending','changes_requested','approved') or (created_by=auth.uid() and status='draft'))) or (public.archive_role()='contributor' and created_by=auth.uid() and status in ('draft','changes_requested')))
 with check(public.archive_role()='admin' or (public.archive_role()='reviewer' and (status in ('pending','changes_requested','approved') or (created_by=auth.uid() and status='draft'))) or (public.archive_role()='contributor' and created_by=auth.uid() and status in ('draft','pending')));
-- No DELETE policy: normal users archive instead of permanently deleting history.
create function public.guard_archive_record() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor_role text := public.archive_role();
begin
 if tg_op='UPDATE' and (new.created_by<>old.created_by or new.id<>old.id or new.created_at<>old.created_at) then
  raise exception 'Record identity and ownership cannot change';
 end if;
 if tg_op='INSERT' and actor_role<>'admin' and new.status<>'draft' then raise exception 'Start as a draft'; end if;
 if actor_role='contributor' then
  if tg_op='INSERT' and (new.visibility<>'private' or new.review_note<>'') then raise exception 'Contributor cannot set publication controls'; end if;
  if tg_op='UPDATE' and (new.visibility<>old.visibility or new.review_note<>old.review_note) then raise exception 'Contributor cannot change review controls'; end if;
 end if;
 if actor_role<>'admin' and new.english_status='published' then raise exception 'Only an administrator can publish translations'; end if;
 if tg_op='UPDATE' and (new.historical_text,new.summary,new.title,new.reflection_text) is distinct from (old.historical_text,old.summary,old.title,old.reflection_text) and old.english_status='published' then new.english_status:='stale'; end if;
 if new.status='published' and trim(new.source_citation)='' then raise exception 'A source citation is required'; end if;
 new.updated_at:=clock_timestamp();
 return new;
end $$;
create trigger guard_archive_record before insert or update on public.archive_records for each row execute function public.guard_archive_record();
create table public.archive_revisions(
 id bigint generated always as identity primary key,
 record_id uuid not null references public.archive_records(id),
 actor_id uuid references auth.users(id),
 changed_at timestamptz not null default now(),
 previous_data jsonb,
 current_data jsonb not null
);
alter table public.archive_revisions enable row level security;
revoke all on public.archive_revisions from anon,authenticated;
grant select on public.archive_revisions to authenticated;
create policy archive_revision_read on public.archive_revisions for select to authenticated
using(public.archive_role() in ('admin','reviewer') or exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid()));
create function public.record_archive_revision() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.archive_revisions(record_id,actor_id,previous_data,current_data)
 values(new.id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function public.record_archive_revision() from public;
create trigger archive_revision after insert or update on public.archive_records for each row execute function public.record_archive_revision();
create table public.archive_assets(
 id uuid primary key default gen_random_uuid(),
 record_id uuid not null references public.archive_records(id) on delete cascade,
 kind text not null check(kind in ('image','audio','video','panorama','document')),
 bucket text,
 object_path text,
 external_url text,
 file_name text not null default '',
 mime_type text not null default '',
 byte_size bigint check(byte_size is null or byte_size>=0),
 caption text not null default '',
 sort_order integer not null default 0 check(sort_order>=0),
 is_public boolean not null default false,
 legacy_reference text unique,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 check((object_path is null) <> (external_url is null)),
 check(object_path is null or (bucket='history-media' and object_path !~ '^/')),
 check(external_url is null or external_url ~ '^https?://')
);
alter table public.archive_assets enable row level security;
revoke all on public.archive_assets from anon,authenticated;
grant select,insert,update,delete on public.archive_assets to authenticated;
create policy archive_assets_read on public.archive_assets for select to authenticated
using(public.archive_role() in ('admin','reviewer') or created_by=auth.uid());
create policy archive_assets_insert on public.archive_assets for insert to authenticated
with check(created_by=auth.uid() and public.archive_role() in ('admin','reviewer','contributor') and (not is_public or public.archive_role()='admin') and exists(
 select 1 from public.archive_records r where r.id=record_id and (public.archive_role()='admin' or (r.created_by=auth.uid() and r.status in ('draft','changes_requested')))
));
create policy archive_assets_update on public.archive_assets for update to authenticated
using(public.archive_role()='admin' or (created_by=auth.uid() and exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid() and r.status in ('draft','changes_requested'))))
with check(public.archive_role()='admin' or (not is_public and created_by=auth.uid() and exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid() and r.status in ('draft','changes_requested'))));
create policy archive_assets_delete on public.archive_assets for delete to authenticated
using(public.archive_role()='admin' or (created_by=auth.uid() and exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid() and r.status in ('draft','changes_requested'))));
-- Deliberate owner-executed projection: anonymous users cannot select the source
-- table (including unpublished translations). This view explicitly limits rows/columns.
create view public.public_archive with(security_barrier=true) as
 select id,kind,title,person,year,summary,historical_text,reflection_text,source_citation,status,visibility,
 case when english_status='published' then title_en end as title_en,
 case when english_status='published' then summary_en end as summary_en,
 case when english_status='published' then historical_text_en end as historical_text_en,
 case when english_status='published' then reflection_text_en end as reflection_text_en,
 coordinate_system,public_latitude,public_longitude,location_precision
 from public.archive_records where status='published' and visibility='public';
create view public.public_atlas with(security_barrier=true) as
 select * from public.public_archive where kind='places';
grant select on public.public_archive, public.public_atlas to anon, authenticated;
create view public.public_archive_assets with(security_barrier=true) as
 select a.id,a.record_id,a.kind,a.bucket,a.object_path,a.external_url,a.file_name,a.mime_type,a.byte_size,a.caption,a.sort_order
 from public.archive_assets a join public.archive_records r on r.id=a.record_id
 where a.is_public and r.status='published' and r.visibility='public';
grant select on public.public_archive_assets to anon,authenticated;
create table public.archive_links(
 id uuid primary key default gen_random_uuid(),
 record_id uuid not null references public.archive_records(id),
 related_id uuid not null references public.archive_records(id),
 relation text not null check(relation in ('person','place','source','route_stop')),
 position integer not null default 0 check(position>=0),
 unique(record_id,related_id,relation),
 check(record_id<>related_id)
);
alter table public.archive_links enable row level security;
revoke all on public.archive_links from anon,authenticated;
grant select,insert,update,delete on public.archive_links to authenticated;
create policy archive_links_read on public.archive_links for select to authenticated
using(exists(select 1 from public.archive_records r where r.id=record_id));
create policy archive_links_write on public.archive_links for all to authenticated
using(public.archive_role()='admin' or exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid() and r.status in ('draft','changes_requested')))
with check(public.archive_role()='admin' or exists(select 1 from public.archive_records r where r.id=record_id and r.created_by=auth.uid() and r.status in ('draft','changes_requested')));
create view public.public_archive_links with(security_barrier=true) as
select l.record_id,l.related_id,l.relation,l.position,r.title,r.summary,r.year,r.public_latitude,r.public_longitude,r.location_precision,r.coordinate_system
from public.archive_links l join public.archive_records r on r.id=l.related_id join public.archive_records parent on parent.id=l.record_id
where r.status='published' and r.visibility='public' and parent.status='published' and parent.visibility='public';
grant select on public.public_archive_links to anon,authenticated;
-- Preserve every legacy point, but only the fixed, approved seed catalogue is
-- promoted to the public atlas. User-created or invalid legacy rows remain
-- private drafts until a human verifies their dates, sources and coordinates.
do $$
declare owner_id uuid;
begin
 if to_regclass('public.missionary_points') is null then return; end if;
 select id into owner_id from auth.users where raw_app_meta_data->>'role'='admin' order by created_at nulls last,id limit 1;
 if owner_id is null then raise exception 'Assign an administrator before migrating legacy records'; end if;
 insert into public.archive_records(
  id,kind,title,title_en,person,year,summary,summary_en,historical_text,historical_text_en,source_citation,
  legacy_reference,status,visibility,coordinate_system,original_latitude,original_longitude,public_latitude,public_longitude,location_precision,created_by,created_at
 )
 select md5('missionary_points:'||m.id)::uuid,'places',m.n,nullif(m.n_en,''),coalesce(m.w,''),
  case when m.y between 1 and 2100 then m.y end,coalesce(m.d,''),nullif(m.d_en,''),coalesce(m.d,''),nullif(m.d_en,''),
  '旧站基础数据；正式资料来源待补充核验。','missionary_points:'||m.id,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then 'published' else 'draft' end,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then 'public' else 'private' end,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then 'WGS84' else 'unknown' end,
  m.la,m.ln,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then m.la end,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then m.ln end,
  case when m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100 then 'exact' else 'hidden' end,
  coalesce(m.created_by,owner_id),m.created_at
 from public.missionary_points m
 on conflict(id) do nothing;
 insert into public.archive_assets(record_id,kind,external_url,file_name,is_public,legacy_reference,created_by)
 select md5('missionary_points:'||m.id)::uuid,v.kind,v.url,regexp_replace(v.url,'^.*/',''),
  (m.status='approved' and m.id !~ '^p_' and m.y between 1 and 2100),
  'missionary_points:'||m.id||':'||v.kind,coalesce(m.created_by,owner_id)
 from public.missionary_points m
 cross join lateral(values
  ('image',nullif(m.img,'')),('audio',nullif(m.audio_url,'')),('video',nullif(m.video_url,'')),
  ('panorama',nullif(m.vr360_url,'')),('document',nullif(m.doc_url,''))
 ) as v(kind,url)
 where v.url is not null and v.url ~ '^https?://'
 on conflict(legacy_reference) do nothing;
end $$;
commit;
