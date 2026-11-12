-- Prueba manual en SQL Editor. Todos los datos de prueba se revierten.
begin;

select set_config('constela.test_ana', gen_random_uuid()::text, true);
select set_config('constela.test_luz', gen_random_uuid()::text, true);

insert into auth.users (id, raw_user_meta_data) values
  (current_setting('constela.test_ana')::uuid, '{"display_name":"Prueba temporal Ana"}'::jsonb),
  (current_setting('constela.test_luz')::uuid, '{"display_name":"Prueba temporal Luz"}'::jsonb);

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('constela.test_ana'),
  'email', 'constela-test@example.invalid',
  'is_anonymous', false
)::text, true);

set local role authenticated;
do $$
declare affected integer;
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'RLS: la usuaria debe ver exactamente su perfil temporal';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Trigger: no se creó el perfil propio';
  end if;
  update public.profiles set display_name = 'Prueba temporal editada' where id = auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'No se pudo editar el perfil propio'; end if;
  update public.profiles set display_name = 'No debe cambiar'
    where id = current_setting('constela.test_luz')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS permitió editar otro perfil'; end if;
end;
$$;

reset role;
rollback;

select 'OK: trigger, lectura propia, edición propia y bloqueo de otro perfil. Datos temporales revertidos.' as resultado;
