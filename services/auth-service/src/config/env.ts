import 'dotenv/config';
import { z } from 'zod';

// Las llaves RSA se pasan en base64 para que quepan en una sola línea de variable de entorno.
const pemBase64 = z
  .string()
  .min(1)
  .transform((valor) => Buffer.from(valor, 'base64').toString('utf8'));

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.url(),

  JWT_PRIVATE_KEY: pemBase64,
  JWT_PUBLIC_KEY: pemBase64,
  JWT_ISSUER: z.string().default('disagro-auth'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DIAS: z.coerce.number().int().positive().default(7),
  VERIFICACION_TTL_HORAS: z.coerce.number().int().positive().default(24),

  // Si el frontend y la API quedan en dominios distintos en producción,
  // la cookie necesita SameSite=none y Secure=true.
  COOKIE_SECURE: z.stringbool().default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Disagro <onboarding@resend.dev>'),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  console.error('Variables de entorno inválidas:', z.treeifyError(resultado.error));
  process.exit(1);
}

export const env = resultado.data;
