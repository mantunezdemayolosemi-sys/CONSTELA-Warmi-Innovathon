-- Añade la misión de autodescubrimiento. No modifica cuentas ni perfiles existentes.
begin;

create table public.strength_discoveries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version integer not null default 1 check (version = 1),
  revision integer not null check (revision > 0),
  self_perception jsonb not null check (jsonb_typeof(self_perception) = 'array' and jsonb_array_length(self_perception) <= 3),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  scores jsonb not null,
  reflection text check (reflection in ('surprised', 'somewhat', 'knew')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strength_discoveries enable row level security;
revoke all on public.strength_discoveries from public, anon, authenticated;
grant select on public.strength_discoveries to authenticated;
create policy strength_discoveries_select_own on public.strength_discoveries
for select to authenticated using (
  (select auth.uid()) = user_id
  and coalesce((select auth.jwt()) ->> 'email', '') <> ''
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

-- La única escritura autorizada valida identidad, elecciones y revisión.
-- No recibe un ID de usuaria ni puntuaciones calculadas por el cliente.
create function public.save_strength_discovery(
  p_expected_revision integer, p_self_perception jsonb, p_answers jsonb, p_reflection text default null
) returns setof public.strength_discoveries
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  valid_skills jsonb := '["creativity","analysis","collaboration","leadership","communication","organization"]'::jsonb;
  allowed jsonb := '{"team":["leadership","collaboration","analysis","creativity"],"idea":["creativity","communication","analysis","organization"],"time":["organization","leadership","communication","collaboration"],"feedback":["analysis","communication","creativity","collaboration"],"opportunity":["leadership","organization","creativity","analysis"],"community":["communication","collaboration","leadership","organization"]}'::jsonb;
  computed_scores jsonb;
  is_complete boolean;
  affected integer;
begin
  if owner_id is null or coalesce(auth.jwt() ->> 'email', '') = '' or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Authenticated user required' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision > 2147483646
    or p_self_perception is null or jsonb_typeof(p_self_perception) <> 'array'
    or p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Invalid discovery input' using errcode = '22023';
  end if;
  if jsonb_array_length(p_self_perception) > 3
    or exists (select 1 from jsonb_array_elements(p_self_perception) s where jsonb_typeof(s) <> 'string' or not (valid_skills @> jsonb_build_array(s)))
    or (select count(*) <> count(distinct value) from jsonb_array_elements(p_self_perception))
    or exists (select 1 from jsonb_each(p_answers) a where not (allowed ? a.key) or jsonb_typeof(a.value) <> 'string' or not ((allowed -> a.key) @> jsonb_build_array(a.value))) then
    raise exception 'Invalid discovery choices' using errcode = '22023';
  end if;
  is_complete := (select count(*) = 6 from jsonb_object_keys(p_answers));
  if p_reflection is not null and (not is_complete or p_reflection not in ('surprised','somewhat','knew')) then
    raise exception 'Invalid reflection' using errcode = '22023';
  end if;
  select jsonb_object_agg(skill, points) into computed_scores from (
    select s.value as skill, count(a.value)::integer as points
    from jsonb_array_elements_text(valid_skills) s
    left join jsonb_each_text(p_answers) a on a.value = s.value group by s.value
  ) totals;
  if p_expected_revision = 0 then
    return query insert into public.strength_discoveries (user_id, revision, self_perception, answers, scores, reflection, completed_at)
    values (owner_id, 1, p_self_perception, p_answers, computed_scores, p_reflection, case when is_complete then now() end)
    on conflict (user_id) do nothing returning *;
  else
    return query update public.strength_discoveries set
      revision = revision + 1, self_perception = p_self_perception, answers = p_answers,
      scores = computed_scores, reflection = p_reflection,
      completed_at = case when is_complete then coalesce(completed_at, now()) end, updated_at = now()
    where user_id = owner_id and revision = p_expected_revision returning *;
  end if;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Discovery revision conflict' using errcode = '40001'; end if;
end;
$$;
revoke all on function public.save_strength_discovery(integer, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_strength_discovery(integer, jsonb, jsonb, text) to authenticated;
commit;
