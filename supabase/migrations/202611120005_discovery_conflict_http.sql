-- La misión histórica usa el mismo SQLSTATE de serialización. Corregir solo
-- su señal de conflicto evita reintentos del proveedor, sin cambiar respuestas.
begin;
do $$
declare
  definition text := pg_get_functiondef('public.save_strength_discovery(integer,jsonb,jsonb,text)'::regprocedure);
begin
  if position('using errcode = ''40001''' in definition) > 0 then
    execute replace(definition, 'using errcode = ''40001''', 'using errcode = ''PT409''');
  end if;
end;
$$;
commit;
