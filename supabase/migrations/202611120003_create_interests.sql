-- Galaxias privadas. No modifica los perfiles ni las misiones existentes.
begin;
create table public.interest_areas (
  id text primary key,
  name text not null,
  description text not null
);
insert into public.interest_areas values
 ('technology','Tecnología e IA','Crear con tecnología y explorar la inteligencia artificial.'),
 ('design','Diseño y creatividad','Dar forma a ideas, experiencias y soluciones.'),
 ('business','Negocios y emprendimiento','Impulsar proyectos y descubrir nuevas maneras de emprender.'),
 ('science','Ciencia e investigación','Hacer preguntas, experimentar y descubrir.'),
 ('social','Impacto social','Contribuir a tu comunidad y transformar realidades.'),
 ('marketing','Marketing y comunicación','Conectar historias, personas y marcas.'),
 ('sustainability','Sostenibilidad','Cuidar el planeta e imaginar futuros sostenibles.'),
 ('health','Salud y bienestar','Explorar cómo mejorar la vida y el bienestar.'),
 ('education','Educación','Compartir conocimientos y transformar el aprendizaje.'),
 ('data','Datos y análisis','Encontrar patrones y respuestas en los datos.'),
 ('arts','Arte y cultura','Expresarte y explorar distintas miradas del mundo.'),
 ('explore','Quiero explorar','Ver posibilidades de todas las galaxias, sin elegir un área todavía.');
create table public.interest_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
create table public.user_interests (
  user_id uuid not null references public.interest_profiles(user_id) on delete cascade,
  interest_id text not null references public.interest_areas(id),
  primary key (user_id, interest_id)
);
alter table public.interest_areas enable row level security;
alter table public.interest_profiles enable row level security;
alter table public.user_interests enable row level security;
revoke all on public.interest_areas, public.interest_profiles, public.user_interests from public, anon, authenticated;
grant select on public.interest_areas to anon, authenticated;
grant select on public.interest_profiles, public.user_interests to authenticated;
create policy interest_areas_read on public.interest_areas for select to anon, authenticated using (true);
create policy interest_profiles_own on public.interest_profiles for select to authenticated using (
  user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'email','') <> ''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) = false
);
create policy user_interests_own on public.user_interests for select to authenticated using (
  user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'email','') <> ''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) = false
);
create function public.save_user_interests(p_expected_revision integer, p_galaxies text[])
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
  if saved_revision is null then raise exception 'Interest revision conflict' using errcode='40001'; end if;
  delete from public.user_interests where user_id=owner_id;
  insert into public.user_interests select owner_id,g from unnest(p_galaxies) g;
  return jsonb_build_object('revision',saved_revision,'galaxies',to_jsonb(p_galaxies),'updated_at',saved_at);
end;
$$;
revoke all on function public.save_user_interests(integer,text[]) from public,anon,authenticated;
grant execute on function public.save_user_interests(integer,text[]) to authenticated;
commit;
