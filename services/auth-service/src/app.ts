import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { openApiDocument } from './docs/openapi';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/error.middleware';
import { authRoutes } from './routes/auth.routes';

export const app = express();

// Detrás de proxies (nginx, Caddy), para que el límite de intentos vea la IP real del cliente
// y no la del proxy: si no, todos los visitantes compartirían el mismo límite.
app.set('trust proxy', env.TRUST_PROXY_SALTOS);

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Disponible = el proceso responde y la base de datos también.
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ estado: 'ok', servicio: 'auth-service', baseDatos: 'ok' });
  } catch {
    res.status(503).json({ estado: 'degradado', servicio: 'auth-service', baseDatos: 'sin conexión' });
  }
});

// Documentación bajo /auth para que conviva con la de otros servicios detrás del mismo dominio.
app.get('/auth/docs/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use(
  '/auth/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Disagro · Auth API',
    swaggerOptions: { withCredentials: true, persistAuthorization: true },
  }),
);

app.use('/auth', authRoutes);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);
