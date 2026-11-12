import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ana = '11111111-1111-4111-8111-111111111111';
const luz = '22222222-2222-4222-8222-222222222222';
const complete = { team: 'creativity', idea: 'creativity', time: 'organization', feedback: 'creativity', opportunity: 'creativity', community: 'organization' };
const save = (revision, perceived = [], answers = {}, reflection = null) => db.query('select * from public.save_strength_discovery($1,$2::jsonb,$3::jsonb,$4)', [revision, JSON.stringify(perceived), JSON.stringify(answers), reflection]);
before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
    grant usage on schema auth, public to anon, authenticated;
    create table auth.users (id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
    insert into auth.users values ('${ana}'), ('${luz}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/202611120002_create_strength_discoveries.sql', import.meta.url), 'utf8'));
});
after(() => db.close());
async function asUser(id, operation, role = 'authenticated', extra = {}) {
  await db.exec('begin');
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id, email: 'test@example.invalid', is_anonymous: false, ...extra })]);
    return await operation();
  } finally { await db.exec('rollback'); }
}

test('la misión se guarda y reanuda únicamente con la identidad de la sesión', async () => {
  await asUser(ana, async () => {
    const { rows } = await save(0, ['organization'], { team: 'creativity' });
    assert.equal(rows[0].user_id, ana);
    assert.equal(rows[0].revision, 1);
    assert.equal(rows[0].completed_at, null);
    assert.deepEqual(rows[0].answers, { team: 'creativity' });
    const resumed = await db.query('select * from public.strength_discoveries');
    assert.equal(resumed.rows.length, 1);
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: luz, email: 'luz@example.invalid' })]);
    assert.equal((await db.query('select * from public.strength_discoveries')).rows.length, 0);
    const own = await save(0, [], {});
    assert.equal(own.rows[0].user_id, luz);
  });
});

test('SQL calcula los resultados, completa las seis misiones y guarda la reflexión', async () => {
  await asUser(ana, async () => {
    const { rows } = await save(0, [], complete);
    assert.ok(rows[0].completed_at);
    assert.equal(rows[0].scores.creativity, 4);
    assert.equal(rows[0].scores.organization, 2);
    assert.equal(rows[0].scores.analysis, 0);
    assert.equal(Object.values(rows[0].scores).reduce((a, b) => a + b), 6);
    const reflected = await save(1, [], complete, 'surprised');
    assert.equal(reflected.rows[0].revision, 2);
    assert.equal(reflected.rows[0].reflection, 'surprised');
  });
});

test('una revisión antigua no pisa el progreso guardado desde otra pestaña', async () => {
  await assert.rejects(asUser(ana, async () => { await save(0); await save(0); }), e => e.code === '40001');
  await assert.rejects(asUser(ana, async () => { await save(0); await save(1); await save(1); }), e => e.code === '40001');
});

test('ni evadiendo el servidor se aceptan respuestas inválidas o puntuaciones falsas', async () => {
  for (const args of [
    [0, ['creativity', 'creativity']], [0, ['unknown']], [0, [], { team: 'organization' }],
    [0, [], { other: 'analysis' }], [0, [], {}, 'surprised'], [0, {}, {}],
    [-1], [0, [], { team: 1 }],
  ]) await assert.rejects(asUser(ana, () => save(...args)), e => e.code === '22023');
  for (const sql of [
    'delete from public.strength_discoveries', 'update public.strength_discoveries set scores = \'{}\'',
    `insert into public.strength_discoveries (user_id, revision, self_perception, answers, scores) values ('${luz}',1,'[]','{}','{}')`,
  ]) await assert.rejects(asUser(ana, () => db.exec(sql)), e => e.code === '42501');
});

test('visitantes y sesiones anónimas no pueden leer ni guardar misiones', async () => {
  await assert.rejects(asUser(null, () => save(0), 'anon'), e => e.code === '42501');
  await assert.rejects(asUser(null, () => db.query('select * from public.strength_discoveries'), 'anon'), e => e.code === '42501');
  await assert.rejects(asUser(ana, () => save(0), 'authenticated', { is_anonymous: true }), e => e.code === '42501');
});
