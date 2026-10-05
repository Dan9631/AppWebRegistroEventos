import { Prisma, TipoItem } from '@prisma/client';
import { prisma } from '../config/prisma';

export const itemModel = {
  listarActivos(filtros: { buscar?: string; tipo?: TipoItem }) {
    const where: Prisma.ItemWhereInput = { activo: true };
    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.buscar) where.nombre = { contains: filtros.buscar, mode: 'insensitive' };

    // Servicios primero, como en el diseño del formulario
    return prisma.item.findMany({ where, orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }] });
  },

  buscarActivosPorIds(ids: number[]) {
    return prisma.item.findMany({ where: { id: { in: ids }, activo: true } });
  },
};
