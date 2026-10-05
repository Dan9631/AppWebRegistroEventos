import 'dotenv/config';
import { z } from 'zod';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4002),
  // Cuántos proxies hay delante del servicio (nginx en desarrollo; Caddy + nginx en la EC2).
  TRUST_PROXY_SALTOS: z.coerce.number().int().min(0).default(1),
  DATABASE_URL: z.string().min(1),

  // Solo la llave pública: este servicio valida tokens, no los emite.
  JWT_PUBLIC_KEY: z
    .string()
    .min(1)
    .transform((valor) => Buffer.from(valor, 'base64').toString('utf8')),
  JWT_ISSUER: z.string().default('disagro-auth'),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  console.error('Variables de entorno inválidas:', z.treeifyError(resultado.error));
  process.exit(1);
}

export const env = resultado.data;
