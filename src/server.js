import { readConfig } from './config.js';
import { createGateway } from './supabase.js';
import { buildApp } from './app.js';
import { createOpportunityCatalog, syncInterval } from './opportunities.js';

try {
  const config = readConfig();
  const opportunities = createOpportunityCatalog();
  await opportunities.load();
  const app = await buildApp({
    gateway: createGateway(config), opportunities, logger: true,
    publicOrigin: new URL(config.PUBLIC_API_URL).origin,
    secureCookies: config.NODE_ENV === 'production',
  });
  const synchronize = () => opportunities.sync().then(result => {
    for (const source of result.sources) app.log.info({ source: source.id, status: source.status }, 'Sincronización de oportunidades');
    if (!result.cache_saved) app.log.warn('El catálogo está en memoria; no se pudo guardar la caché.');
  }).catch(() => app.log.warn('No pudimos sincronizar el catálogo de oportunidades.'));
  const timer = setInterval(synchronize, syncInterval); timer.unref();
  app.addHook('onClose', async () => { clearInterval(timer); });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => { await app.close(); });
  }
  await app.listen({ port: config.PORT, host: config.HOST });
  void synchronize();
} catch (error) {
  // Los fallos de arranque no incluyen valores de configuración.
  console.error(error.message.startsWith('Revisa .env:') || error.message.startsWith('PUBLIC_API_URL')
    ? error.message : 'No pudimos iniciar Constela. Revisa la configuración y que el puerto esté libre.');
  process.exitCode = 1;
}
