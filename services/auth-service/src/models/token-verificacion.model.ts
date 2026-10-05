import { prisma } from '../config/prisma';

export const tokenVerificacionModel = {
  crear(usuarioId: number, tokenHash: string, expiraEn: Date) {
    return prisma.tokenVerificacion.create({ data: { usuarioId, tokenHash, expiraEn } });
  },

  buscarPorHash(tokenHash: string) {
    return prisma.tokenVerificacion.findUnique({ where: { tokenHash } });
  },

  /** Invalida los tokens pendientes de un usuario (al reenviar el correo solo vale el último). */
  invalidarPendientes(usuarioId: number) {
    return prisma.tokenVerificacion.updateMany({
      where: { usuarioId, usadoEn: null },
      data: { usadoEn: new Date() },
    });
  },

  /**
   * Marca el token como usado y el email como verificado en una sola transacción.
   * El filtro `usadoEn: null` evita que dos peticiones simultáneas consuman el mismo token.
   */
  async consumir(id: number, usuarioId: number): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const ahora = new Date();
      const { count } = await tx.tokenVerificacion.updateMany({
        where: { id, usadoEn: null },
        data: { usadoEn: ahora },
      });
      if (count === 0) return false;

      await tx.usuario.update({
        where: { id: usuarioId },
        data: { emailVerificadoEn: ahora },
      });
      return true;
    });
  },
};
