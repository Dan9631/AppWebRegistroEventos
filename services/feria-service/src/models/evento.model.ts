import { prisma } from '../config/prisma';

export const eventoModel = {
  buscarActivo() {
    return prisma.evento.findFirst({ where: { activo: true } });
  },
};
