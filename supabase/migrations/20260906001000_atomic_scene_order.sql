-- IDs follow the numeric scene/work IDs used by the existing VR client.
begin;
create or replace function public.reorder_vr_scenes(p_work_id bigint, p_scene_ids bigint[])
returns void language plpgsql security invoker set search_path = '' as $$
declare existing_ids bigint[];
begin
  if not public.is_history_map_admin() then
    raise exception 'Administrator required' using errcode = '42501';
  end if;
  perform id from public.vr_works where id = p_work_id for update;
  if not found then raise exception 'Work not found'; end if;
  perform id from public.vr_scenes where work_id = p_work_id for update;
  select coalesce(array_agg(id order by id), '{}'::bigint[]) into existing_ids
    from public.vr_scenes where work_id = p_work_id;
  if p_scene_ids is null or cardinality(p_scene_ids) <> cardinality(existing_ids)
     or exists(select 1 from unnest(p_scene_ids) id where id is null)
     or (select count(distinct id) from unnest(p_scene_ids) id) <> cardinality(existing_ids)
     or not (existing_ids @> p_scene_ids and p_scene_ids @> existing_ids) then
    raise exception 'Scene list changed; reload before sorting';
  end if;
  update public.vr_scenes s set sort_order = ordered.position
    from unnest(p_scene_ids) with ordinality as ordered(id, position)
    where s.id = ordered.id and s.work_id = p_work_id;
end;
$$;
revoke all on function public.reorder_vr_scenes(bigint,bigint[]) from public, anon;
grant execute on function public.reorder_vr_scenes(bigint,bigint[]) to authenticated;
commit;
