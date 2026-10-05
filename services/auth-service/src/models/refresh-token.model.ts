import { prisma } from '../config/prisma';

export const refreshTokenModel = {
  crear(usuarioId: number, tokenHash: string, expiraEn: Date) {
    return prisma.refreshToken.create({ data: { usuarioId, tokenHash, expiraEn } });
  },

  buscarPorHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  /** Revoca un token solo si sigue vigente. Devuelve false si otra petición ya lo revocó. */
  async revocar(id: number): Promise<boolean> {
    const { count } = await prisma.refreshToken.updateMany({
      where: { id, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    return count > 0;
  },

  /** Cierra todas las sesiones del usuario (se usa al detectar reutilización de un token). */
  revocarTodos(usuarioId: number) {
    return prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  },
};
