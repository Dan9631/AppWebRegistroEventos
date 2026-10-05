import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

const conDetalle = {
  evento: true,
  items: { include: { item: true }, orderBy: { itemId: 'asc' } },
} satisfies Prisma.ConfirmacionInclude;

export type ConfirmacionConDetalle = Prisma.ConfirmacionGetPayload<{ include: typeof conDetalle }>;

export const confirmacionModel = {
  buscarDeUsuario(eventoId: number, usuarioId: number): Promise<ConfirmacionConDetalle | null> {
    return prisma.confirmacion.findUnique({
      where: { eventoId_usuarioId: { eventoId, usuarioId } },
      include: conDetalle,
    });
  },

  /** Crea la confirmación con sus ítems en una sola operación (todo o nada). */
  crear(datos: {
    eventoId: number;
    usuarioId: number;
    fechaHoraAsistencia: Date;
    descuentoServicios: number;
    descuentoProductos: number;
    items: { itemId: number; precioUnitario: Prisma.Decimal }[];
  }): Promise<ConfirmacionConDetalle> {
    return prisma.confirmacion.create({
      data: {
        eventoId: datos.eventoId,
        usuarioId: datos.usuarioId,
        fechaHoraAsistencia: datos.fechaHoraAsistencia,
        descuentoServicios: datos.descuentoServicios,
        descuentoProductos: datos.descuentoProductos,
        items: { create: datos.items },
      },
      include: conDetalle,
    });
  },
};
