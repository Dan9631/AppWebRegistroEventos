import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { openApiDocument } from './docs/openapi';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/error.middleware';
import { feriaRoutes } from './routes/feria.routes';

export const app = express();

// Detrás de proxies (nginx, Caddy): para que req.ip sea la IP real del cliente.
app.set('trust proxy', env.TRUST_PROXY_SALTOS);

// Sin CORS: el frontend llama a la API desde el mismo origen (proxy de Vite, nginx o balanceador).
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Disponible = el proceso responde y la base de datos también.
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ estado: 'ok', servicio: 'feria-service', baseDatos: 'ok' });
  } catch {
    res.status(503).json({ estado: 'degradado', servicio: 'feria-service', baseDatos: 'sin conexión' });
  }
});

app.get('/feria/docs/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use(
  '/feria/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Disagro · Feria API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.use('/feria', feriaRoutes);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);
