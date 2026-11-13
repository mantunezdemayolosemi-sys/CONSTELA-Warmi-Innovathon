-- Aplicar una sola vez. No modifica respuestas, intereses ni credenciales.
begin;
alter table public.profiles
  add column account_type text not null default 'learner' check(account_type in ('learner','company','entrepreneur')),
  add column organization_name text not null default '',
  add constraint profile_organization check (
    (account_type='learner' and organization_name='') or
    (account_type in ('company','entrepreneur') and char_length(btrim(organization_name)) between 2 and 100));

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  profile_name text := btrim(new.raw_user_meta_data->>'display_name');
  kind text := coalesce(new.raw_user_meta_data->>'account_type','learner');
  organization text := btrim(coalesce(new.raw_user_meta_data->>'organization_name',''));
begin
  if profile_name is null or char_length(profile_name) not between 2 and 100 then
    raise exception 'display_name must contain between 2 and 100 characters';
  end if;
  insert into public.profiles(id,display_name,account_type,organization_name)
    values(new.id,profile_name,kind,case when kind='learner' then '' else organization end);
  return new;
end; $$;
revoke all on function public.create_profile_for_new_user() from public,anon,authenticated;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  organization_name text not null check(char_length(btrim(organization_name)) between 2 and 100),
  kind text not null check(kind in ('challenge','job')),
  title text not null check(char_length(btrim(title)) between 6 and 120),
  description text not null check(char_length(btrim(description)) between 30 and 2500),
  deliverable text not null check(char_length(btrim(deliverable)) between 10 and 1000),
  effort text not null check(char_length(btrim(effort)) between 2 and 100),
  compensation text not null check(char_length(btrim(compensation)) between 2 and 200),
  level text not null check(level in ('beginner','intermediate','all')),
  mode text not null check(mode in ('online','in_person','hybrid')),
  galaxies text[] not null check(cardinality(galaxies) between 1 and 3 and array_position(galaxies,null) is null and
    galaxies <@ array['technology','design','business','science','social','marketing','sustainability','health','education','data','arts']::text[]),
  skills text[] not null check(cardinality(skills)<=6 and array_position(skills,null) is null and
    skills <@ array['creativity','analysis','collaboration','leadership','communication','organization']::text[]),
  deadline timestamptz not null,
  status text not null default 'open' check(status in ('open','closed')),
  is_simulation boolean not null default true check(is_simulation),
  created_at timestamptz not null default now()
);
create index community_posts_owner on public.community_posts(owner_id);
create index community_posts_active on public.community_posts(kind,status,deadline);
alter table public.community_posts enable row level security;
revoke all on public.community_posts from public,anon,authenticated;
grant select on public.community_posts to authenticated;
create policy community_posts_read on public.community_posts for select to authenticated
using (
  (select auth.uid()) is not null and coalesce((select auth.jwt())->>'email','')<>''
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and ((status='open' and deadline>now()) or owner_id=(select auth.uid()))
);

create function public.publish_community_post(p_post jsonb)
returns setof public.community_posts language plpgsql security definer set search_path='' as $$
declare owner public.profiles; closing timestamptz;
begin
  select * into owner from public.profiles where id=auth.uid();
  if owner.id is null or owner.account_type not in ('company','entrepreneur')
    or coalesce(auth.jwt()->>'email','')='' or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception using errcode='42501',message='Publisher account required';
  end if;
  closing := (p_post->>'deadline')::timestamptz;
  if closing is null or closing<=now() or closing>now()+interval '365 days' then
    raise exception using errcode='22023',message='Invalid deadline';
  end if;
  return query insert into public.community_posts(owner_id,organization_name,kind,title,description,deliverable,
    effort,compensation,level,mode,galaxies,skills,deadline)
    values(owner.id,owner.organization_name,p_post->>'kind',btrim(p_post->>'title'),btrim(p_post->>'description'),
    btrim(p_post->>'deliverable'),btrim(p_post->>'effort'),btrim(p_post->>'compensation'),p_post->>'level',p_post->>'mode',
    array(select jsonb_array_elements_text(p_post->'galaxies')),array(select jsonb_array_elements_text(p_post->'skills')),closing)
    returning *;
end; $$;
revoke all on function public.publish_community_post(jsonb) from public,anon,authenticated;
grant execute on function public.publish_community_post(jsonb) to authenticated;

create function public.close_community_post(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.community_posts set status='closed'
    where id=p_id and owner_id=auth.uid()
    and exists(select 1 from public.profiles where id=auth.uid() and account_type in ('company','entrepreneur'))
    and coalesce(auth.jwt()->>'email','')<>'' and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false;
  if not found then raise exception using errcode='PT404',message='Publication not found'; end if;
end; $$;
revoke all on function public.close_community_post(uuid) from public,anon,authenticated;
grant execute on function public.close_community_post(uuid) to authenticated;

create table public.challenge_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,post_id)
);
alter table public.challenge_saves enable row level security;
revoke all on public.challenge_saves from public,anon,authenticated;
grant select,insert,delete on public.challenge_saves to authenticated;
create policy challenge_saves_read on public.challenge_saves for select to authenticated using(user_id=(select auth.uid()));
create policy challenge_saves_delete on public.challenge_saves for delete to authenticated using(user_id=(select auth.uid()));
create policy challenge_saves_insert on public.challenge_saves for insert to authenticated
with check(user_id=(select auth.uid()) and
  exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='learner') and
  exists(select 1 from public.community_posts where id=post_id and kind='challenge' and status='open' and deadline>now()));

-- Organizaciones, problemas y condiciones enteramente ficticios. Sin cuentas Auth de empresas inventadas.
insert into public.community_posts(id,organization_name,kind,title,description,deliverable,effort,compensation,level,mode,galaxies,skills,deadline) values
('40000000-0000-4000-8000-000000000001','Dulce Órbita · emprendimiento ficticio','challenge','Una historia que invite a probar',
'Lucía prepara postres en un emprendimiento ficticio de Miraflores. Sus publicaciones muestran precios, pero no cuentan qué hace especial cada receta. Imagina cómo presentarla a sus primeras clientas.',
'Tres ideas de publicaciones y un texto de hasta 100 palabras para una de ellas. Explica a quién quieres llegar y por qué elegiste ese mensaje.',
'2–3 horas · a tu ritmo','Práctica simulada sin remuneración','beginner','online',array['marketing','design','business'],array['creativity','communication'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000002','Raíz Circular · empresa ficticia','challenge','Dale una segunda vida a un empaque',
'Una marca ficticia de productos de cuidado personal en Barranco quiere reducir residuos. Su empaque actual se desecha después de un solo uso. Propón una alternativa que sea sencilla de explicar y de reutilizar.',
'Un boceto o descripción del empaque y tres pasos de reutilización. Incluye una limitación de tu propuesta.',
'3–4 horas · a tu ritmo','Práctica simulada sin remuneración','beginner','online',array['sustainability','design'],array['creativity','analysis'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000003','Tejido Vecinal · iniciativa ficticia','challenge','Organiza una feria que nos conecte',
'Un colectivo ficticio de emprendedoras de San Juan de Lurigancho prepara una feria de un día. Hay diez puestos, poco tiempo y tareas aún sin repartir. Ayúdalas a convertir la idea en un plan realizable.',
'Un cronograma de un día, reparto de cinco tareas y un plan alternativo si llueve. Puedes usar texto o una tabla.',
'2 horas · a tu ritmo','Práctica simulada sin remuneración','beginner','online',array['social','business'],array['organization','leadership','collaboration'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000004','Nube Andina · empresa ficticia','challenge','Una web que se entienda a la primera',
'Una empresa ficticia de Lima recibe consultas repetidas porque su página no explica cómo reservar una asesoría. No necesitas programar: imagina un recorrido claro para alguien que visita la web por primera vez.',
'Un esquema de tres pantallas o pasos, el texto del botón principal y dos preguntas que harías a una usuaria para probarlo.',
'3 horas · sin programación obligatoria','Práctica simulada sin remuneración','beginner','online',array['technology','design'],array['analysis','creativity','communication'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000005','Aprende en Órbita · emprendimiento ficticio','challenge','Explica algo difícil con una idea sencilla',
'Un proyecto educativo ficticio de Lima quiere enseñar seguridad digital a personas que recién usan internet. Convierte una recomendación sobre contraseñas o mensajes sospechosos en una actividad cotidiana fácil de recordar.',
'Una actividad de diez minutos, sus materiales y una pregunta para comprobar qué aprendió la participante.',
'2 horas · a tu ritmo','Práctica simulada sin remuneración','beginner','online',array['education','technology','social'],array['communication','creativity'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000006','Semilla de Datos · empresa ficticia','challenge','Encuentra la pregunta detrás de los números',
'Una tienda ficticia de Lima observa estas ventas semanales: lunes 8, martes 12, miércoles 7, jueves 15 y viernes 18 pedidos. Quiere decidir qué investigar antes de aumentar su producción.',
'Un gráfico sencillo, dos observaciones y tres preguntas para entender las ventas. Distingue los datos de tus suposiciones.',
'1–2 horas · sin herramientas avanzadas','Práctica simulada sin remuneración','beginner','online',array['data','business'],array['analysis','organization'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000007','Dulce Órbita · emprendimiento ficticio','job','Asistente de contenido para redes',
'Vacante ficticia para mostrar cómo una emprendedora podría compartir trabajo en Constela. El rol propone organizar un calendario y redactar publicaciones de una marca de postres. No corresponde a una contratación real.',
'Interés en comunicación, redacción clara y organización. En una futura vacante real se indicaría cómo postular y qué evidencia presentar.',
'Medio tiempo · condiciones ilustrativas','S/ 900 mensuales referenciales · solo simulación','beginner','hybrid',array['marketing','business'],array['communication','organization'],now()+interval '30 days'),
('40000000-0000-4000-8000-000000000008','Nube Andina · empresa ficticia','job','Asistente de investigación de experiencia',
'Vacante ficticia de una empresa de Lima para ilustrar oportunidades laborales. El rol consiste en ordenar observaciones de entrevistas y colaborar en mejoras de una web. No recibe postulaciones ni CV.',
'Curiosidad por el diseño de experiencias, escucha y capacidad de síntesis. No se exige una puntuación del test de Constela.',
'20 horas semanales · condiciones ilustrativas','S/ 1 200 mensuales referenciales · solo simulación','beginner','online',array['design','technology','data'],array['analysis','collaboration'],now()+interval '30 days');
commit;
