-- Comprobación del esquema real. No envía correos y revierte todos los datos.
begin;
select set_config('constela.test_ana', gen_random_uuid()::text, true);
select set_config('constela.test_luz', gen_random_uuid()::text, true);
insert into auth.users (id, raw_user_meta_data) values
  (current_setting('constela.test_ana')::uuid, '{"display_name":"Misión temporal Ana"}'::jsonb),
  (current_setting('constela.test_luz')::uuid, '{"display_name":"Misión temporal Luz"}'::jsonb);
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('constela.test_ana'), 'email', 'constela-test@example.invalid', 'is_anonymous', false
)::text, true);
set local role authenticated;
do $$
declare saved public.strength_discoveries;
begin
  select * into saved from public.save_strength_discovery(0, '["organization"]', '{}', null);
  if saved.user_id <> auth.uid() or saved.revision <> 1 or saved.completed_at is not null then
    raise exception 'Identidad o progreso inicial incorrecto';
  end if;
  select * into saved from public.save_strength_discovery(1, '["organization"]',
    '{"team":"creativity","idea":"creativity","time":"organization","feedback":"creativity","opportunity":"creativity","community":"organization"}', 'surprised');
  if saved.revision <> 2 or saved.completed_at is null or saved.reflection <> 'surprised'
    or saved.scores <> '{"creativity":4,"analysis":0,"collaboration":0,"leadership":0,"communication":0,"organization":2}'::jsonb then
    raise exception 'Resultado o reflexión incorrectos';
  end if;
  begin
    perform public.save_strength_discovery(1, '[]', '{}', null);
    raise exception 'Se permitió sobrescribir otra revisión';
  exception when serialization_failure then null;
  end;
  begin
    update public.strength_discoveries set scores = '{}' where user_id = auth.uid();
    raise exception 'Se permitió falsificar puntuaciones';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('constela.test_luz'), 'email', 'constela-test@example.invalid', 'is_anonymous', false
)::text, true);
do $$
declare saved public.strength_discoveries;
begin
  if (select count(*) from public.strength_discoveries) <> 0 then
    raise exception 'RLS permitió ver la misión de otra usuaria';
  end if;
  select * into saved from public.save_strength_discovery(0, '[]', '{"team":"analysis"}', null);
  if saved.user_id <> auth.uid() then raise exception 'Se escribió sobre otra usuaria'; end if;
end;
$$;
reset role;
rollback;
select 'OK: progreso privado, cálculo 4/2, reflexión, revisión y bloqueo de puntuaciones falsas. Datos temporales revertidos.' as resultado;
