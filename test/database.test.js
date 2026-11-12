import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// PostgreSQL embebido. El esquema auth se simula: no se necesitan cuenta,
// Docker ni correos reales para comprobar el SQL y los permisos.
const db = new PGlite();
const ana = '11111111-1111-4111-8111-111111111111';
const luz = '22222222-2222-4222-8222-222222222222';

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null);
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select (auth.jwt() ->> 'sub')::uuid $$;
  `);
  const migration = await readFile(new URL('../supabase/migrations/202611120001_create_profiles.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.query('insert into auth.users values ($1, $2), ($3, $4)', [
    ana, JSON.stringify({ display_name: 'Ana' }), luz, JSON.stringify({ display_name: 'Luz' }),
  ]);
});
after(() => db.close());

async function asRole(role, userId, operation) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, email: 'test@example.com', is_anonymous: false })]);
    return await operation();
  } finally { await db.exec('rollback'); }
}

test('el trigger crea perfiles y rechaza altas inválidas atómicamente', async () => {
  const { rows } = await db.query('select id, display_name from public.profiles order by display_name');
  assert.deepEqual(rows, [{ id: ana, display_name: 'Ana' }, { id: luz, display_name: 'Luz' }]);
  await assert.rejects(db.query('insert into auth.users values ($1, $2)', ['33333333-3333-4333-8333-333333333333', '{}']), /display_name/);
  const count = await db.query('select count(*)::int as count from auth.users');
  assert.equal(count.rows[0].count, 2);
});

test('una usuaria solo puede leer su perfil', async () => {
  await asRole('authenticated', ana, async () => {
    const { rows } = await db.query('select id from public.profiles');
    assert.deepEqual(rows, [{ id: ana }]);
    const other = await db.query('select * from public.profiles where id = $1', [luz]);
    assert.equal(other.rows.length, 0);
  });
});

test('visitantes sin sesión no tienen acceso', async () => {
  await assert.rejects(asRole('anon', null, () => db.query('select * from public.profiles')), /permission denied/);
});

test('puede editar su nombre pero no el de otra usuaria', async () => {
  await asRole('authenticated', ana, async () => {
    const own = await db.query('update public.profiles set display_name = $1 where id = $2 returning display_name, updated_at', ['Ana María', ana]);
    assert.equal(own.rows[0].display_name, 'Ana María');
    assert.ok(own.rows[0].updated_at);
    const other = await db.query('update public.profiles set display_name = $1 where id = $2 returning id', ['Modificado', luz]);
    assert.equal(other.rows.length, 0);
  });
});

test('no permite cambiar identidad/fechas, insertar ni borrar perfiles', async () => {
  for (const sql of [
    `update public.profiles set id = '${luz}' where id = '${ana}'`,
    'update public.profiles set created_at = now()',
    'update public.profiles set updated_at = now()',
    `insert into public.profiles (id, display_name) values ('${ana}', 'Otra')`,
    'delete from public.profiles',
  ]) {
    await assert.rejects(asRole('authenticated', ana, () => db.exec(sql)), /permission denied/);
  }
});

test('nombres fuera de rango fallan aunque se evite la API', async () => {
  await assert.rejects(asRole('authenticated', ana, () => db.exec("update public.profiles set display_name = ' '")), /check constraint/);
});

test('borrar la cuenta desde administración elimina su perfil', async () => {
  await db.exec('begin');
  try {
    await db.query('delete from auth.users where id = $1', [ana]);
    const { rows } = await db.query('select * from public.profiles where id = $1', [ana]);
    assert.equal(rows.length, 0);
  } finally { await db.exec('rollback'); }
});
