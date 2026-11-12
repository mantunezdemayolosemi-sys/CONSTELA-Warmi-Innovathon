import { z } from 'zod';

const name = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const registerBody = z.strictObject({ name, email, password: z.string().min(12).max(128) });
export const loginBody = z.strictObject({ email, password: z.string().min(1).max(128) });
export const refreshBody = z.strictObject({ refresh_token: z.string().min(1).max(4096) });
export const profileBody = z.strictObject({ name });
export const accepted = { message: 'Si el correo puede registrarse, recibirás un enlace para confirmar tu cuenta. Si ya tienes cuenta, inicia sesión.' };
