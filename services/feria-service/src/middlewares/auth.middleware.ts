import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

/** Contenido del access token emitido por auth-service. */
export interface UsuarioToken {
  sub: string;
  tipo: string;
  email: string;
  emailVerificado?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

/**
 * Valida el JWT con la llave pública de auth-service.
 * No hace falta consultar a auth-service en cada petición: la firma garantiza el contenido.
 */
export function requiereAuth(req: Request, _res: Response, next: NextFunction) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    throw new AppError(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
  }

  try {
    req.usuario = jwt.verify(token, env.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: env.JWT_ISSUER,
    }) as UsuarioToken;
  } catch {
    throw new AppError(401, 'TOKEN_INVALIDO', 'Sesión inválida o expirada');
  }
  next();
}

/** Restringe la ruta a ciertos tipos de usuario. Usar después de requiereAuth. */
export function requiereTipo(...tipos: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !tipos.includes(req.usuario.tipo)) {
      throw new AppError(403, 'SIN_PERMISO', 'No tiene permiso para realizar esta acción');
    }
    next();
  };
}

/**
 * Solo cuentas con el correo confirmado. Usar después de requiereAuth.
 * Un token sin el dato (emitido antes de existir) se trata como no confirmado.
 */
export function requiereEmailVerificado(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.emailVerificado !== true) {
    throw new AppError(403, 'EMAIL_NO_VERIFICADO', 'Debe confirmar su correo antes de confirmar su asistencia');
  }
  next();
}
