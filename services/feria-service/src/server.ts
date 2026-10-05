import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const servidor = app.listen(env.PORT, () => {
  console.info(`feria-service escuchando en el puerto ${env.PORT}`);
});

async function apagar(senal: string) {
  console.info(`${senal} recibido, cerrando feria-service`);
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void apagar('SIGTERM'));
process.on('SIGINT', () => void apagar('SIGINT'));
