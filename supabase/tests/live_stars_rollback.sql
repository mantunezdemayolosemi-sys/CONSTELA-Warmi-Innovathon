-- Proyecto de desarrollo autorizado: premio único y privacidad, sin dejar progreso QA.
begin;
do $$ declare qa uuid; begin
  if (select count(*) from public.profiles where display_name='Usuaria de prueba' and account_type='learner')<>1 then
    raise exception 'Se requiere la cuenta QA de usuaria autorizada';
  end if;
  select id into qa from public.profiles where display_name='Usuaria de prueba';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',qa,'email','qa@example.invalid','is_anonymous',false)::text,true);
end; $$;
set local role authenticated;
do $$ declare first_result jsonb; repeated jsonb; begin
  first_result:=public.complete_challenge_practice('40000000-0000-4000-8000-000000000001',
    'Una propuesta QA temporal con tres ideas para contar la historia del emprendimiento ficticio.',
    'Practiqué la creatividad y la comunicación para explicar una propuesta.');
  repeated:=public.complete_challenge_practice('40000000-0000-4000-8000-000000000001',
    'Una propuesta QA temporal con tres ideas para contar la historia del emprendimiento ficticio.',
    'Practiqué la creatividad y la comunicación para explicar una propuesta.');
  if (first_result->>'awarded')::boolean is distinct from true or (repeated->>'awarded')::boolean is distinct from false then
    raise exception 'El premio no es único';
  end if;
  if (select count(*) from public.challenge_practices where user_id=auth.uid())<>1 then
    raise exception 'Cantidad de estrellas inesperada';
  end if;
end; $$;
rollback;
