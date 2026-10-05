import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { refreshTokenModel } from '../models/refresh-token.model';
import { AppError } from '../utils/errors';
import { generarToken, hashToken } from '../utils/crypto';

/** Contenido del access token. Los demás servicios solo necesitan esto para autorizar. */
export interface AccessTokenPayload {
  sub: string; // id del usuario
  tipo: string; // código del tipo de usuario, p. ej. 'CLIENTE'
  email: string;
  emailVerificado: boolean;
}

export const tokenService = {
  /** Firma con la llave privada (RS256): solo este servicio puede emitir tokens. */
  firmarAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
      issuer: env.JWT_ISSUER,
    });
  },

  /** Verifica con la llave pública: el mismo código sirve en cualquier otro microservicio. */
  verificarAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: env.JWT_ISSUER,
      }) as AccessTokenPayload;
    } catch {
      throw new AppError(401, 'TOKEN_INVALIDO', 'Sesión inválida o expirada');
    }
  },

  async emitirRefreshToken(usuarioId: number): Promise<{ token: string; expiraEn: Date }> {
    const token = generarToken();
    const expiraEn = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DIAS * 24 * 60 * 60 * 1000);
    await refreshTokenModel.crear(usuarioId, hashToken(token), expiraEn);
    return { token, expiraEn };
  },

  /**
   * Rotación: cada refresh token se usa una sola vez y se cambia por uno nuevo.
   * Si llega un token ya revocado, alguien lo copió: se cierran todas las sesiones del usuario.
   */
  async rotarRefreshToken(token: string): Promise<{ usuarioId: number; token: string; expiraEn: Date }> {
    const registro = await refreshTokenModel.buscarPorHash(hashToken(token));
    if (!registro) {
      throw new AppError(401, 'SESION_INVALIDA', 'Sesión inválida');
    }

    if (registro.revocadoEn) {
      await refreshTokenModel.revocarTodos(registro.usuarioId);
      throw new AppError(401, 'SESION_INVALIDA', 'Sesión inválida');
    }

    if (registro.expiraEn < new Date()) {
      throw new AppError(401, 'SESION_EXPIRADA', 'La sesión expiró, inicie sesión nuevamente');
    }

    const revocado = await refreshTokenModel.revocar(registro.id);
    if (!revocado) {
      // Otra petición lo rotó al mismo tiempo: se trata igual que una reutilización.
      await refreshTokenModel.revocarTodos(registro.usuarioId);
      throw new AppError(401, 'SESION_INVALIDA', 'Sesión inválida');
    }

    const nuevo = await this.emitirRefreshToken(registro.usuarioId);
    return { usuarioId: registro.usuarioId, ...nuevo };
  },

  async revocarRefreshToken(token: string): Promise<void> {
    const registro = await refreshTokenModel.buscarPorHash(hashToken(token));
    if (registro) await refreshTokenModel.revocar(registro.id);
  },
};
