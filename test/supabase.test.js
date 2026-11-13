import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../src/supabase.js';

const config = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  PUBLIC_API_URL: 'http://localhost:3000',
};
const id = '11111111-1111-4111-8111-111111111111';
const user = { id, email: 'ana@example.com', email_confirmed_at: '2026-11-12T00:00:00Z', identities: [] };
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' },
});

test('SDK envía alta con metadatos y destino de confirmación, sin pedir sesión', async () => {
  const calls = [];
  const gateway = createGateway(config, async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return json(user);
  });
  const result = await gateway.register({ name: 'Ana', email: user.email, password: 'frase-larga-123' });
  assert.equal(result, undefined);
  assert.ok(calls[0].url.includes('/auth/v1/signup'));
  assert.ok(calls[0].url.includes('redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fconfirmed'));
  assert.equal(calls[0].body.data.display_name, 'Ana');
});

test('SDK verifica identidad remota y rechaza un correo sin confirmar', async () => {
  let confirmed = true;
  const gateway = createGateway(config, async (url, init) => {
    assert.ok(String(url).endsWith('/auth/v1/user'));
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer access-token');
    return json({ ...user, email_confirmed_at: confirmed ? user.email_confirmed_at : null });
  });
  assert.equal((await gateway.authenticate('access-token')).id, id);
  confirmed = false;
  await assert.rejects(gateway.authenticate('access-token'), e => e.status === 401);
});

test('lectura y edición conservan el JWT de cada usuaria y filtran por su ID', async () => {
  const calls = [];
  const gateway = createGateway(config, async (url, init) => {
    calls.push({ url: String(url), token: new Headers(init.headers).get('authorization'), method: init.method });
    return json([{ id, display_name: 'Ana' }]);
  });
  await gateway.getProfile('token-ana', id);
  await gateway.updateProfile('token-luz', id, 'Luz');
  assert.deepEqual(calls.map(c => c.token), ['Bearer token-ana', 'Bearer token-luz']);
  assert.ok(calls.every(c => c.url.includes(`id=eq.${id}`)));
  assert.equal(calls[1].method, 'PATCH');
});

test('correo duplicado no revela cuentas y caída del proveedor se distingue', async () => {
  let unavailable = false;
  const gateway = createGateway(config, async () => json(
    unavailable ? { message: 'private-provider-detail' } : { code: 'user_already_exists', msg: 'already exists' },
    unavailable ? 500 : 422,
  ));
  await gateway.register({ name: 'Ana', email: user.email, password: 'frase-larga-123' });
  unavailable = true;
  await assert.rejects(gateway.register({ name: 'Ana', email: user.email, password: 'frase-larga-123' }),
    e => e.status === 503 && !e.message.includes('private-provider-detail'));
});

test('logout revoca solo la sesión del JWT recibido usando clave pública', async () => {
  const gateway = createGateway(config, async (url, init) => {
    assert.ok(String(url).endsWith('/auth/v1/logout?scope=local'));
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer current-access-token');
    assert.equal(new Headers(init.headers).get('apikey'), config.SUPABASE_PUBLISHABLE_KEY);
    return new Response(null, { status: 204 });
  });
  await gateway.logout('current-access-token');
});

test('el SDK conserva el JWT en el guardado de misiones sin aceptar identidad ni puntuaciones', async () => {
  const calls = [];
  const record = { revision: 1, self_perception: [], answers: {}, reflection: null };
  const gateway = createGateway(config, async (url, init) => {
    calls.push({ url: String(url), token: new Headers(init.headers).get('authorization'), body: init.body && JSON.parse(init.body) });
    return json(String(url).includes('/rpc/') ? record : []);
  });
  assert.equal(await gateway.getDiscovery('user-jwt', id), null);
  assert.deepEqual(await gateway.saveDiscovery('user-jwt', { ...record, revision: 0 }), record);
  assert.ok(calls[0].url.includes(`user_id=eq.${id}`));
  assert.ok(calls[1].url.endsWith('/rest/v1/rpc/save_strength_discovery'));
  assert.deepEqual(calls[1].body, { p_expected_revision: 0, p_self_perception: [], p_answers: {}, p_reflection: null });
  assert.ok(calls.every(c => c.token === 'Bearer user-jwt'));
});

test('una colisión de progreso devuelve conflicto y un fallo del proveedor no expone detalles', async () => {
  let conflict = true;
  const gateway = createGateway(config, async () => json({ code: conflict ? 'PT409' : 'XX000', message: 'private-sql-detail' }, 409));
  const body = { revision: 1, self_perception: [], answers: {}, reflection: null };
  await assert.rejects(gateway.saveDiscovery('jwt', body), e => e.status === 409 && e.code === 'DISCOVERY_CONFLICT');
  conflict = false;
  await assert.rejects(gateway.saveDiscovery('jwt', body), e => e.status === 503 && !e.message.includes('private-sql-detail'));
});

test('galaxias: conserva identidad al leer relaciones y escribe sin ID con conflicto PT409', async () => {
  const calls=[]; let conflict=false;
  const gateway=createGateway(config,async(url,init)=>{
    calls.push({url:String(url),token:new Headers(init.headers).get('authorization'),body:init.body&&JSON.parse(init.body)});
    if(conflict)return json({code:'PT409',message:'Interest revision conflict'},409);
    return json(String(url).includes('/rpc/')?{revision:2,galaxies:['data']}:[{revision:1,updated_at:'2026-11-12',user_interests:[{interest_id:'technology'}]}]);
  });
  assert.deepEqual((await gateway.getInterests('own-jwt',id)).galaxies,['technology']);
  await gateway.saveInterests('own-jwt',{revision:1,galaxies:['data']});
  assert.ok(calls[0].url.includes(`user_id=eq.${id}`));
  assert.deepEqual(calls[1].body,{p_expected_revision:1,p_galaxies:['data']});
  assert.ok(calls.every(call=>call.token==='Bearer own-jwt'));
  conflict=true;await assert.rejects(gateway.saveInterests('own-jwt',{revision:1,galaxies:['data']}),e=>e.status===409&&e.code==='INTERESTS_CONFLICT');
});
