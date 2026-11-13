import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { ServiceError } from './supabase.js';
import { registerBody, loginBody, profileBody, accepted } from './validation.js';
import { discoveryBody, summarizeDiscovery, skills, missions } from './discovery.js';
import { galaxies, interestsBody } from './interests.js';
import { opportunitiesQuery, recommend } from './opportunities.js';

const accessName = 'constela_access';
const refreshName = 'constela_refresh';

export async function registerWeb(app, { gateway, opportunities, publicOrigin, secureCookies, authLimit }) {
  await app.register(cookie);
  await app.register(fastifyStatic, {
    root: fileURLToPath(new URL('../public/', import.meta.url)),
    prefix: '/assets/',
    index: false,
    dotfiles: 'deny',
  });
  for (const path of ['/', '/ingresar', '/registro', '/cuenta', '/confirmacion', '/descubrir', '/galaxias', '/oportunidades']) {
    app.get(path, (_request, reply) => reply.sendFile('index.html'));
  }

  const cookieOptions = { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/web/' };
  function saveSession(reply, session) {
    const ttl = Math.max(1, (session.expires_at ?? (Date.now() / 1000 + 3600)) - Math.floor(Date.now() / 1000));
    reply.setCookie(accessName, session.access_token, { ...cookieOptions, maxAge: ttl });
    reply.setCookie(refreshName, session.refresh_token, { ...cookieOptions, maxAge: 7 * 24 * 3600 });
  }
  function clearSession(reply) {
    reply.clearCookie(accessName, cookieOptions);
    reply.clearCookie(refreshName, cookieOptions);
  }
  async function identity(request) {
    const token = request.cookies[accessName];
    try {
      if (!token) throw new ServiceError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
      const user = await gateway.authenticate(token);
      return { token, user };
    } catch (error) {
      if (error.status === 401 && request.cookies[refreshName]) {
        throw new ServiceError(401, 'SESSION_EXPIRED', 'Tu sesión necesita renovarse.');
      }
      throw error;
    }
  }

  await app.register(async (web) => {
    web.addHook('onRequest', async (request) => {
      if (!['GET', 'HEAD'].includes(request.method) &&
          (request.headers.origin !== publicOrigin || request.headers['sec-fetch-site'] === 'cross-site')) {
        throw new ServiceError(403, 'INVALID_ORIGIN', 'Abre Constela en la dirección original para continuar.');
      }
    });

    await web.register(async (auth) => {
      auth.addHook('onRequest', auth.rateLimit({ max: authLimit, timeWindow: '15 minutes', groupId: 'web-auth' }));
      auth.post('/web/register', async (request, reply) => {
        await gateway.register(registerBody.parse(request.body));
        return reply.code(202).send(accepted);
      });
      auth.post('/web/login', async (request, reply) => {
        const data = await gateway.login(loginBody.parse(request.body));
        saveSession(reply, data.session);
        return { user: data.user };
      });
      auth.post('/web/refresh', async (request, reply) => {
        try {
          const token = request.cookies[refreshName];
          if (!token) throw new ServiceError(401, 'UNAUTHORIZED', 'Vuelve a iniciar sesión.');
          const data = await gateway.refresh(token);
          saveSession(reply, data.session);
          return { user: data.user };
        } catch (error) {
          if (error.status === 401) clearSession(reply);
          throw error;
        }
      });
    });

    web.get('/web/session', async (request) => {
      const { token, user } = await identity(request);
      return {
        user: { id: user.id, email: user.email },
        profile: await gateway.getProfile(token, user.id),
      };
    });
    web.patch('/web/profile', async (request) => {
      const body = profileBody.parse(request.body);
      const { token, user } = await identity(request);
      return { profile: await gateway.updateProfile(token, user.id, body.name) };
    });
    web.get('/web/discovery', async (request) => {
      const { token, user } = await identity(request);
      return { catalog: { version: 1, skills, missions }, discovery: summarizeDiscovery(await gateway.getDiscovery(token, user.id)) };
    });
    web.get('/web/interests', async (request) => {
      const { token, user } = await identity(request);
      return { catalog: galaxies, interests: await gateway.getInterests(token, user.id) };
    });
    web.put('/web/interests', async (request) => {
      const { token } = await identity(request);
      return { interests: await gateway.saveInterests(token, interestsBody.parse(request.body)) };
    });
    web.get('/web/opportunities', async (request) => {
      const { token, user } = await identity(request);
      const filters = opportunitiesQuery.parse(request.query);
      const [interests, discovery] = await Promise.all([
        gateway.getInterests(token, user.id), gateway.getDiscovery(token, user.id),
      ]);
      return recommend(opportunities.get(), interests, summarizeDiscovery(discovery), filters);
    });
    web.put('/web/discovery', async (request) => {
      const { token } = await identity(request);
      const body = discoveryBody.parse(request.body);
      return { discovery: summarizeDiscovery(await gateway.saveDiscovery(token, body)) };
    });
    web.post('/web/logout', async (request, reply) => {
      try {
        let token = request.cookies[accessName];
        if (!token && request.cookies[refreshName]) {
          const data = await gateway.refresh(request.cookies[refreshName]);
          token = data.session.access_token;
        }
        if (token) await gateway.logout(token);
      } catch (error) {
        if (![400, 401].includes(error.status)) throw error;
      } finally { clearSession(reply); }
      return reply.code(204).send();
    });
  });
}
