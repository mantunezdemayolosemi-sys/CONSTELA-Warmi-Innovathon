-- Solo en el proyecto de desarrollo autorizado. Usa la cuenta QA existente.
-- Todos los cambios se revierten, incluidos tipo de cuenta y publicaciones.
begin;
do $$
declare qa uuid;
begin
  if (select count(*) from public.profiles where display_name='Usuaria de prueba')<>1 then
    raise exception 'Se requiere una única cuenta QA autorizada';
  end if;
  select id into qa from public.profiles where display_name='Usuaria de prueba';
  update public.profiles set account_type='entrepreneur',organization_name='Proyecto QA ficticio' where id=qa;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',qa,'email','qa@example.invalid','is_anonymous',false)::text,true);
end; $$;
set local role authenticated;
do $$
declare publication public.community_posts;
begin
  select * into publication from public.publish_community_post(jsonb_build_object(
    'kind','job','title','QA temporal sin contratación real',
    'description','Caso ficticio y temporal para verificar la publicación con RLS en el proyecto de desarrollo.',
    'deliverable','Requisitos ilustrativos de una vacante de prueba.',
    'effort','2 horas de prueba','compensation','Solo simulación','level','beginner','mode','online',
    'galaxies',jsonb_build_array('design'),'skills',jsonb_build_array('creativity'),
    'deadline',now()+interval '1 day','owner_id','00000000-0000-4000-8000-000000000000','is_simulation',false));
  if publication.owner_id<>auth.uid() or publication.organization_name<>'Proyecto QA ficticio' or not publication.is_simulation then
    raise exception 'El propietario o la marca de simulación son incorrectos';
  end if;
  perform public.close_community_post(publication.id);
  if not exists(select 1 from public.community_posts where id=publication.id and status='closed') then
    raise exception 'No se guardó el cierre propio';
  end if;
end; $$;
rollback;
