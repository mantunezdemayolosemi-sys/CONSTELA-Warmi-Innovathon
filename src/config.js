import { z } from 'zod';

const safeUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
}, 'Usa HTTPS, excepto para localhost.');

const publicKey = z.string().min(1).refine((key) => {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    // Solo detecta el tipo de clave; la autenticidad la comprueba Supabase.
    return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch { return false; }
}, 'Usa una clave publishable o anon; nunca secret ni service_role.');

const schema = z.object({
  SUPABASE_URL: safeUrl,
  SUPABASE_PUBLISHABLE_KEY: publicKey,
  PUBLIC_API_URL: safeUrl.default('http://localhost:3000'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export function readConfig(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Mostrar nombres de variables, nunca sus valores.
    throw new Error(`Revisa .env: ${[...new Set(result.error.issues.map(i => i.path[0]))].join(', ')}. Consulta .env.example.`);
  }
  if (result.data.NODE_ENV === 'production' && !result.data.PUBLIC_API_URL.startsWith('https://')) {
    throw new Error('PUBLIC_API_URL debe usar HTTPS en producción.');
  }
  return result.data;
}
