import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/errors';

/** Valida y normaliza el body con un esquema Zod antes de llegar al controlador. */
export function validarBody(esquema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const resultado = esquema.safeParse(req.body);
    if (!resultado.success) {
      throw new AppError(
        400,
        'DATOS_INVALIDOS',
        'Los datos enviados no son válidos',
        resultado.error.issues.map((issue) => ({ campo: issue.path.join('.'), mensaje: issue.message })),
      );
    }
    req.body = resultado.data;
    next();
  };
}
