import { readConfig } from './config.js';
import { createGateway } from './supabase.js';
import { buildApp } from './app.js';

try {
  const config = readConfig();
  const app = await buildApp({ gateway: createGateway(config), logger: true });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => { await app.close(); });
  }
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error) {
  // Los fallos de arranque no incluyen valores de configuración.
  console.error(error.message.startsWith('Revisa .env:') || error.message.startsWith('PUBLIC_API_URL')
    ? error.message : 'No pudimos iniciar Constela. Revisa la configuración y que el puerto esté libre.');
  process.exitCode = 1;
}
