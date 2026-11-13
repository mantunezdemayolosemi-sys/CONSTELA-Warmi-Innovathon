import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { ServiceError } from '../src/supabase.js';
import { readConfig } from '../src/config.js';

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'ana@example.com' };
const profile = { id: user.id, display_name: 'Ana' };
const valid = { name: 'Ana', email: 'ana@example.com', password: 'una-frase-larga-123' };

async function fixture(t, overrides = {}, options = {}) {
  const calls = [];
  const gateway = {
    register: async (body) => { calls.push(body); },
    login: async () => ({ user, session: { access_token: 'access', refresh_token: 'refresh' } }),
    refresh: async () => ({ session: { access_token: 'new-access', refresh_token: 'new-refresh' } }),
    authenticate: async (token) => {
      if (token !== 'valid-token') throw new ServiceError(401, 'UNAUTHORIZED', 'Inicia sesión.');
      return user;
    },
    getProfile: async (token, id) => { calls.push({ token, id }); return profile; },
    updateProfile: async (token, id, name) => { calls.push({ token, id, name }); return { ...profile, display_name: name }; },
    logout: async (token) => { calls.push(token); },
    ...overrides,
  };
  const app = await buildApp({ gateway, authLimit: 100, ...options });
  t.after(() => app.close());
  return { app, calls };
}

test('registro normaliza nombre/correo y nunca devuelve contraseña o sesión', async t => {
  const { app, calls } = await fixture(t);
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { ...valid, name: ' Ana ', email: ' ANA@example.com ' } });
  assert.equal(response.statusCode, 202);
  assert.deepEqual(calls, [{...valid,account_type:'learner',organization_name:''}]);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.ok(!response.body.includes(valid.password));
  assert.ok(!response.body.includes('access_token'));
});

test('rechaza datos inválidos antes de contactar a Supabase', async t => {
  const { app, calls } = await fixture(t);
  for (const change of [{ name: ' ' }, { email: 'no-es-correo' }, { password: 'corta' }, { password: 'a'.repeat(129) }, { id: user.id }, { role: 'admin' }]) {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { ...valid, ...change } });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, 'INVALID_INPUT');
  }
  assert.equal(calls.length, 0);
});

test('sin token, token inválido o cabecera mal formada no se consulta el perfil', async t => {
  const { app, calls } = await fixture(t);
  for (const authorization of ['', 'Bearer invalid', 'Basic valid-token', 'Bearer valid-token extra']) {
    const response = await app.inject({ url: '/me', headers: { authorization } });
    assert.equal(response.statusCode, 401);
  }
  assert.equal(calls.length, 0);
});

test('/me usa la identidad del token y no permite elegir otra usuaria', async t => {
  const { app, calls } = await fixture(t);
  const response = await app.inject({ url: '/me?id=otra-usuaria', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { user, profile });
  assert.deepEqual(calls, [{ token: 'valid-token', id: user.id }]);
});

test('solo permite cambiar el nombre del perfil autenticado', async t => {
  const { app, calls } = await fixture(t);
  const request = { method: 'PATCH', url: '/me', headers: { authorization: 'Bearer valid-token' } };
  const rejected = await app.inject({ ...request, payload: { name: 'Ana', id: 'otro-id' } });
  assert.equal(rejected.statusCode, 400);
  const updated = await app.inject({ ...request, payload: { name: ' Ana María ' } });
  assert.equal(updated.statusCode, 200);
  assert.deepEqual(calls, [{ token: 'valid-token', id: user.id, name: 'Ana María' }]);
});

test('errores de credenciales no revelan si existe el correo', async t => {
  const { app } = await fixture(t, { login: async () => { throw new ServiceError(401, 'INVALID_CREDENTIALS', 'Revisa tus credenciales y confirma tu correo.'); } });
  const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: valid.email, password: valid.password } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error, 'INVALID_CREDENTIALS');
});

test('login, renovación y cierre de sesión exponen el contrato esperado', async t => {
  const { app, calls } = await fixture(t);
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: valid.email, password: valid.password } });
  assert.equal(login.statusCode, 200);
  assert.equal(login.json().session.access_token, 'access');
  const refresh = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: 'refresh' } });
  assert.equal(refresh.statusCode, 200);
  assert.equal(refresh.json().session.refresh_token, 'new-refresh');
  const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: { authorization: 'Bearer valid-token' } });
  assert.equal(logout.statusCode, 204);
  assert.equal(logout.body, '');
  assert.deepEqual(calls, ['valid-token']);
});

test('limita intentos de autenticación y comparte presupuesto entre rutas', async t => {
  const { app } = await fixture(t, {}, { authLimit: 2 });
  const register = await app.inject({ method: 'POST', url: '/auth/register', payload: valid });
  const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: valid.email, password: valid.password } });
  const blocked = await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refresh_token: 'refresh' } });
  assert.equal(register.statusCode, 202);
  assert.equal(login.statusCode, 200);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.json().error, 'RATE_LIMITED');
});

test('errores internos y JSON mal formado no filtran detalles', async t => {
  const { app } = await fixture(t, { register: async () => { throw new Error('secret-password'); } });
  const response = await app.inject({ method: 'POST', url: '/auth/register', payload: valid });
  assert.equal(response.statusCode, 500);
  assert.ok(!response.body.includes('secret-password'));
  const malformed = await app.inject({ method: 'POST', url: '/auth/register', headers: { 'content-type': 'application/json' }, payload: '{' });
  assert.equal(malformed.statusCode, 400);
});

test('rechaza claves privilegiadas y exige HTTPS en producción', () => {
  const config = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' };
  assert.equal(readConfig(config).PORT, 3000);
  assert.throws(() => readConfig({ ...config, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' }), /Revisa .env: SUPABASE_PUBLISHABLE_KEY/);
  const serviceKey = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.sig`;
  assert.throws(() => readConfig({ ...config, SUPABASE_PUBLISHABLE_KEY: serviceKey }), /SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(() => readConfig({ ...config, NODE_ENV: 'production' }), /HTTPS/);
});
