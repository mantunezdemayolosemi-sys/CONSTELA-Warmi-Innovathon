import { buildApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { createGateway } from '../src/supabase.js';
import { createOpportunityCatalog } from '../src/opportunities.js';

// One initialized application per warm function; never start a listening port.
export function createServerlessHandler(initialize) {
  let ready;
  return async (request, response) => {
    try {
      ready ??= Promise.resolve().then(initialize).then(async app => {
        await app.ready();
        return app;
      }).catch(error => { ready = undefined; throw error; });
      const app = await ready;
      app.server.emit('request', request, response);
    } catch {
      response.statusCode = 503;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.end(JSON.stringify({error:'SERVICE_UNAVAILABLE',message:'Constela no está disponible. Revisa la configuración del despliegue.'}));
    }
  };
}

export default createServerlessHandler(async () => {
  const config = readConfig({...process.env, NODE_ENV:'production'});
  const opportunities = createOpportunityCatalog();
  await opportunities.load();
  return buildApp({
    gateway:createGateway(config), opportunities,
    publicOrigin:new URL(config.PUBLIC_API_URL).origin,
    secureCookies:true,
  });
});
