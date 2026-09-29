import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('PostgreSQL enforces editorial roles, translation privacy and revision history',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb,created_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;insert into auth.users(id,raw_app_meta_data) values ('00000000-0000-0000-0000-000000000001','{"role":"admin"}'),('00000000-0000-0000-0000-000000000002','{"role":"contributor"}'),('00000000-0000-0000-0000-000000000003','{"role":"reviewer"}');create table public.missionary_points(id text primary key,n text,w text,y integer,la double precision,ln double precision,d text,img text,audio_url text,video_url text,vr360_url text,doc_url text,status text,created_at timestamptz default now(),n_en text,w_en text,d_en text,created_by uuid);insert into public.missionary_points(id,n,w,y,la,ln,d,status) values('seed_place','旧站地点','人物',1900,30,120,'史实','approved'),('p_unreviewed','待核验地点','人物',-1,31,121,'','approved');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260929000000_archive_v2.sql',import.meta.url),'utf8'));
 const actor=async n=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[`00000000-0000-0000-0000-00000000000${n}`]);await db.exec('set role authenticated');};
 await actor(2);
 const {rows:[row]}=await db.query("insert into public.archive_records(kind,title,title_en,english_status) values('places','测试档案','Unreviewed English','draft') returning id");
 await assert.rejects(db.query("update public.archive_records set status='published',source_citation='source' where id=$1",[row.id]));
 await assert.rejects(db.query("update public.archive_records set visibility='public' where id=$1",[row.id]));
 await db.query("update public.archive_records set status='pending' where id=$1",[row.id]);
 const locked=await db.query("update public.archive_records set title='changed' where id=$1 returning id",[row.id]);assert.equal(locked.rows.length,0);
 await actor(3);await db.query("update public.archive_records set status='approved',review_note='checked' where id=$1",[row.id]);
 await assert.rejects(db.query("update public.archive_records set status='published',source_citation='source' where id=$1",[row.id]));
 await actor(1);await db.query("update public.archive_records set status='published',visibility='public',source_citation='source' where id=$1",[row.id]);
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query('select * from public.archive_records'));
 const publicRows=await db.query('select * from public.public_archive');assert.equal(publicRows.rows.length,2);assert.equal(publicRows.rows.find(item=>item.id===row.id).title_en,null);
 await actor(1);await db.query("update public.archive_records set english_status='published' where id=$1",[row.id]);
 await db.query("update public.archive_records set summary='Revised Chinese' where id=$1",[row.id]);
 const stale=await db.query('select english_status from public.archive_records where id=$1',[row.id]);assert.equal(stale.rows[0].english_status,'stale');
 const revisions=await db.query('select count(*)::int as total from public.archive_revisions');assert.equal(revisions.rows[0].total,8);
 const migrated=await db.query("select status,visibility,coordinate_system,public_latitude,original_latitude from public.archive_records where legacy_reference='missionary_points:seed_place'");assert.deepEqual(migrated.rows[0],{status:'published',visibility:'public',coordinate_system:'WGS84',public_latitude:30,original_latitude:30});
 const quarantined=await db.query("select status,visibility,public_latitude,original_latitude from public.archive_records where legacy_reference='missionary_points:p_unreviewed'");assert.deepEqual(quarantined.rows[0],{status:'draft',visibility:'private',public_latitude:null,original_latitude:31});
 }finally{await db.close();}
});
