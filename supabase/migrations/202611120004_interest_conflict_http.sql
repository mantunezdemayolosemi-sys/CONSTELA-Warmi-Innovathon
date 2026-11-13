-- 40001 indica serialización y el proveedor puede reintentar la transacción.
-- Un conflicto de revisión es una decisión de negocio, no un error reintentable.
-- PT409 hace que PostgREST responda HTTP 409 directamente. La migración 003 ya
-- fue aplicada; se conserva y se añade esta corrección sin modificar datos.
begin;
create or replace function public.save_user_interests(p_expected_revision integer, p_galaxies text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  saved_revision integer;
  saved_at timestamptz;
begin
  if owner_id is null or coalesce(auth.jwt()->>'email','') = '' or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'Authenticated user required' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision > 2147483646
    or p_galaxies is null or cardinality(p_galaxies) not between 1 and 5
    or array_ndims(p_galaxies) <> 1 then
    raise exception 'Invalid interests' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_galaxies) g where g is null or not exists (select 1 from public.interest_areas a where a.id = g))
    or (select count(*) <> count(distinct g) from unnest(p_galaxies) g)
    or ('explore' = any(p_galaxies) and cardinality(p_galaxies) <> 1) then
    raise exception 'Invalid galaxies' using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.interest_profiles(user_id,revision) values(owner_id,1)
    on conflict(user_id) do nothing returning revision,updated_at into saved_revision,saved_at;
  else
    update public.interest_profiles set revision=revision+1,updated_at=now()
    where user_id=owner_id and revision=p_expected_revision returning revision,updated_at into saved_revision,saved_at;
  end if;
  if saved_revision is null then raise exception 'Interest revision conflict' using errcode='PT409'; end if;
  delete from public.user_interests where user_id=owner_id;
  insert into public.user_interests select owner_id,g from unnest(p_galaxies) g;
  return jsonb_build_object('revision',saved_revision,'galaxies',to_jsonb(p_galaxies),'updated_at',saved_at);
end;
$$;
revoke all on function public.save_user_interests(integer,text[]) from public,anon,authenticated;
grant execute on function public.save_user_interests(integer,text[]) to authenticated;
commit;
