import { NextFunction, Request, Response } from 'express';
import { AccessTokenPayload, tokenService } from '../services/token.service';
import { AppError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      usuario?: AccessTokenPayload;
    }
  }
}

/** Exige un access token válido en el header Authorization: Bearer <token>. */
export function requiereAuth(req: Request, _res: Response, next: NextFunction) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    throw new AppError(401, 'NO_AUTENTICADO', 'Debe iniciar sesión');
  }
  req.usuario = tokenService.verificarAccessToken(token);
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
