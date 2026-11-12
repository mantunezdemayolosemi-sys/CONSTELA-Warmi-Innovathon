import Fastify, { LogController } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { z } from 'zod';
import { ServiceError } from './supabase.js';
import { registerWeb } from './web.js';
import { registerBody, loginBody, refreshBody, profileBody, accepted } from './validation.js';

export async function buildApp({ gateway, logger = false, authLimit = 10, publicOrigin = 'http://localhost:3000', secureCookies = false }) {
  const app = Fastify({
    logger,
    bodyLimit: 16 * 1024,
    // No registrar URL, cabeceras, cuerpos ni tokens en logs de solicitudes.
    logController: new LogController({ disableRequestLogging: true }),
    trustProxy: false,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100, timeWindow: '1 minute',
    errorResponseBuilder: () => ({ statusCode: 429, error: 'RATE_LIMITED', message: 'Demasiados intentos. Intenta más tarde.' }),
  });
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('Referrer-Policy', 'no-referrer');
    return payload;
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: 'INVALID_INPUT', message: 'Revisa los datos enviados.',
        fields: [...new Set(error.issues.flatMap(i => i.path.length ? [i.path[0]] : ['body']))],
      });
    }
    if (error instanceof ServiceError) {
      return reply.code(error.status).send({ error: error.code, message: error.message });
    }
    if (error.statusCode === 429) return reply.code(429).send({ error: 'RATE_LIMITED', message: 'Demasiados intentos. Intenta más tarde.' });
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: 'INVALID_REQUEST', message: 'La solicitud no es válida.' });
    }
    request.log.error({ requestId: request.id }, 'Error interno al procesar una solicitud');
    return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'No pudimos completar la operación.' });
  });

  app.get('/health', async () => ({ status: 'ok', service: 'constela-api' }));
  app.get('/auth/confirmed', async (request, reply) =>
    reply.redirect(request.query.error ? '/confirmacion?estado=error#' : '/confirmacion#'));

  await registerWeb(app, { gateway, publicOrigin, secureCookies, authLimit });

  await app.register(async (auth) => {
    // Presupuesto compartido entre registro, login y renovación por IP.
    auth.addHook('onRequest', auth.rateLimit({ max: authLimit, timeWindow: '15 minutes', groupId: 'auth' }));
    auth.post('/auth/register', async (request, reply) => {
      await gateway.register(registerBody.parse(request.body));
      return reply.code(202).send(accepted);
    });
    auth.post('/auth/login', async (request) => gateway.login(loginBody.parse(request.body)));
    auth.post('/auth/refresh', async (request) => {
      const body = refreshBody.parse(request.body);
      return gateway.refresh(body.refresh_token);
    });
  });

  await app.register(async (privateRoutes) => {
    privateRoutes.decorateRequest('authUser', null);
    privateRoutes.decorateRequest('accessToken', null);
    privateRoutes.addHook('onRequest', async (request) => {
      const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
      if (!match || match[1].length > 8192) throw new ServiceError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
      request.accessToken = match[1];
      request.authUser = await gateway.authenticate(match[1]);
    });
    privateRoutes.get('/me', async (request) => ({
      user: { id: request.authUser.id, email: request.authUser.email },
      profile: await gateway.getProfile(request.accessToken, request.authUser.id),
    }));
    privateRoutes.patch('/me', async (request) => {
      const body = profileBody.parse(request.body);
      return { profile: await gateway.updateProfile(request.accessToken, request.authUser.id, body.name) };
    });
    privateRoutes.post('/auth/logout', async (request, reply) => {
      await gateway.logout(request.accessToken);
      return reply.code(204).send();
    });
  });
  return app;
}
