import { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { authService, Sesion } from '../services/auth.service';
import { AppError } from '../utils/errors';

const COOKIE_REFRESH = 'refresh_token';

// La cookie solo viaja a las rutas de /auth, y JavaScript del navegador no puede leerla.
const opcionesCookie: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/auth',
};

function responderSesion(res: Response, sesion: Sesion) {
  res.cookie(COOKIE_REFRESH, sesion.refreshToken, { ...opcionesCookie, expires: sesion.refreshExpiraEn });
  res.json({ accessToken: sesion.accessToken, usuario: sesion.usuario });
}

function leerRefreshToken(req: Request): string {
  const token = req.cookies?.[COOKIE_REFRESH];
  if (!token) {
    throw new AppError(401, 'SESION_INVALIDA', 'No hay una sesión activa');
  }
  return token;
}

export const authController = {
  async registro(req: Request, res: Response) {
    const usuario = await authService.registrar(req.body);
    res.status(201).json({
      mensaje: 'Cuenta creada. Revise su correo para confirmar su cuenta.',
      usuario,
    });
  },

  async verificar(req: Request, res: Response) {
    await authService.verificarEmail(req.body.token);
    res.json({ mensaje: 'Correo confirmado. Ya puede iniciar sesión.' });
  },

  async reenviarVerificacion(req: Request, res: Response) {
    await authService.reenviarVerificacion(req.body.email);
    res.json({ mensaje: 'Si la cuenta existe y no está confirmada, se envió un nuevo correo.' });
  },

  async login(req: Request, res: Response) {
    responderSesion(res, await authService.login(req.body));
  },

  async refresh(req: Request, res: Response) {
    try {
      responderSesion(res, await authService.refrescar(leerRefreshToken(req)));
    } catch (error) {
      res.clearCookie(COOKIE_REFRESH, opcionesCookie);
      throw error;
    }
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[COOKIE_REFRESH];
    if (token) await authService.logout(token);
    res.clearCookie(COOKIE_REFRESH, opcionesCookie);
    res.status(204).end();
  },

  async perfil(req: Request, res: Response) {
    res.json({ usuario: await authService.obtenerPerfil(Number(req.usuario!.sub)) });
  },
};
