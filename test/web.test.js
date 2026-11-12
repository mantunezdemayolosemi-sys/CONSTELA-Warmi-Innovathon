import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { ServiceError } from '../src/supabase.js';

const origin = 'http://localhost:3000';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.invalid' };
const profile = { id: user.id, display_name: 'Ana' };
const session = { access_token: 'private-access', refresh_token: 'private-refresh', expires_at: Math.floor(Date.now() / 1000) + 3600 };
const authCookies = 'constela_access=private-access; constela_refresh=private-refresh';

async function setup(t, overrides = {}, options = {}) {
  const calls = [];
  const gateway = {
    register: async body => { calls.push(['register', body.name]); },
    login: async () => ({ user, session }),
    authenticate: async token => {
      calls.push(['authenticate', token]);
      if (token !== 'private-access') throw new ServiceError(401, 'UNAUTHORIZED', 'Inicia sesión.');
      return user;
    },
    getProfile: async (_token, id) => { assert.equal(id, user.id); return profile; },
    updateProfile: async (_token, id, name) => { calls.push(['update', id, name]); return { ...profile, display_name: name }; },
    refresh: async token => { calls.push(['refresh', token]); return { user, session }; },
    logout: async token => { calls.push(['logout', token]); },
    ...overrides,
  };
  const app = await buildApp({ gateway, authLimit: 100, ...options });
  t.after(() => app.close());
  return { app, calls };
}

test('la interfaz y sus rutas se sirven sin exponer archivos de configuración', async t => {
  const { app } = await setup(t);
  for (const url of ['/', '/registro', '/ingresar', '/cuenta', '/confirmacion']) {
    const page = await app.inject(url);
    assert.equal(page.statusCode, 200);
    assert.match(page.headers['content-type'], /text\/html/);
    assert.match(page.body, /lang="es"/);
    assert.match(page.headers['content-security-policy'], /script-src 'self'/);
  }
  assert.equal((await app.inject('/assets/app.js')).statusCode, 200);
  for (const url of ['/.env', '/assets/.env', '/assets/../.env', '/src/config.js']) {
    assert.ok([403, 404].includes((await app.inject(url)).statusCode));
  }
});

test('las operaciones web rechazan CSRF, origen ausente y origen cruzado', async t => {
  const { app, calls } = await setup(t);
  for (const url of ['/web/login', '/web/register', '/web/refresh', '/web/logout', '/web/profile']) {
    for (const headers of [{}, { origin: 'https://otro.example' }, { origin: 'null' }, { origin, 'sec-fetch-site': 'cross-site' }]) {
      const response = await app.inject({ method: url === '/web/profile' ? 'PATCH' : 'POST', url, headers: { cookie: authCookies, ...headers }, payload: {} });
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().error, 'INVALID_ORIGIN');
    }
  }
  assert.equal(calls.length, 0);
});

test('login guarda tokens solo en cookies HttpOnly y Secure en producción', async t => {
  const { app } = await setup(t, {}, { secureCookies: true });
  const response = await app.inject({ method: 'POST', url: '/web/login', headers: { origin }, payload: { email: user.email, password: 'some-password' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { user });
  assert.ok(!response.body.includes(session.access_token));
  assert.ok(!response.body.includes(session.refresh_token));
  const cookies = response.headers['set-cookie'];
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\/web\//);
  }
});

test('un login rechazado no crea cookies y el registro no inicia una sesión', async t => {
  const { app } = await setup(t, { login: async () => { throw new ServiceError(401, 'INVALID_CREDENTIALS', 'Revisa tus credenciales.'); } });
  const login = await app.inject({ method: 'POST', url: '/web/login', headers: { origin }, payload: { email: user.email, password: 'wrong' } });
  assert.equal(login.statusCode, 401);
  assert.equal(login.headers['set-cookie'], undefined);
  const register = await app.inject({ method: 'POST', url: '/web/register', headers: { origin }, payload: { name: 'Ana', email: user.email, password: 'a-long-password-123' } });
  assert.equal(register.statusCode, 202);
  assert.equal(register.headers['set-cookie'], undefined);
});

test('la sesión usa identidad verificada y el perfil no acepta otro ID', async t => {
  const { app, calls } = await setup(t);
  const own = await app.inject({ url: '/web/session', headers: { cookie: authCookies } });
  assert.equal(own.statusCode, 200);
  assert.deepEqual(own.json(), { user, profile });
  const injection = await app.inject({ method: 'PATCH', url: '/web/profile', headers: { origin, cookie: authCookies }, payload: { name: 'Otra', id: 'another-user' } });
  assert.equal(injection.statusCode, 400);
  assert.ok(!calls.some(c => c[0] === 'update'));
  const update = await app.inject({ method: 'PATCH', url: '/web/profile', headers: { origin, cookie: authCookies }, payload: { name: 'Ana María' } });
  assert.equal(update.statusCode, 200);
  assert.deepEqual(calls.at(-1), ['update', user.id, 'Ana María']);
});

test('solo pide renovar si existe cookie de renovación y nunca expone tokens', async t => {
  const { app, calls } = await setup(t);
  const missing = await app.inject('/web/session');
  assert.equal(missing.json().error, 'UNAUTHORIZED');
  const expired = await app.inject({ url: '/web/session', headers: { cookie: 'constela_access=expired; constela_refresh=private-refresh' } });
  assert.equal(expired.json().error, 'SESSION_EXPIRED');
  const response = await app.inject({ method: 'POST', url: '/web/refresh', headers: { origin, cookie: 'constela_refresh=private-refresh' }, payload: {} });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { user });
  assert.equal(response.headers['set-cookie'].length, 2);
  assert.ok(calls.some(c => c[0] === 'refresh' && c[1] === 'private-refresh'));
});

test('logout revoca la sesión y elimina ambas cookies', async t => {
  const { app, calls } = await setup(t);
  const response = await app.inject({ method: 'POST', url: '/web/logout', headers: { origin, cookie: authCookies }, payload: {} });
  assert.equal(response.statusCode, 204);
  assert.deepEqual(calls, [['logout', session.access_token]]);
  assert.equal(response.headers['set-cookie'].length, 2);
  assert.ok(response.headers['set-cookie'].every(c => c.includes('Expires=Thu, 01 Jan 1970')));
  assert.equal((await app.inject('/web/session')).statusCode, 401);
});

test('la confirmación elimina el fragmento del enlace y no refleja errores externos', async t => {
  const { app } = await setup(t);
  const confirmed = await app.inject('/auth/confirmed');
  assert.equal(confirmed.statusCode, 302);
  assert.equal(confirmed.headers.location, '/confirmacion#');
  const failed = await app.inject('/auth/confirmed?error=access_denied&error_description=private-detail');
  assert.equal(failed.headers.location, '/confirmacion?estado=error#');
  assert.ok(!failed.body.includes('private-detail'));
});
