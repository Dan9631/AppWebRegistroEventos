import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { loginDto, reenviarVerificacionDto, registroDto, verificarDto } from '../dtos/auth.dto';
import { requiereAuth } from '../middlewares/auth.middleware';
import { limiteAuth, limiteCorreo } from '../middlewares/rate-limit.middleware';
import { validarBody } from '../middlewares/validar.middleware';

export const authRoutes = Router();

authRoutes.post('/registro', limiteAuth, validarBody(registroDto), authController.registro);
authRoutes.post('/verificar', validarBody(verificarDto), authController.verificar);
authRoutes.post('/reenviar-verificacion', limiteCorreo, validarBody(reenviarVerificacionDto), authController.reenviarVerificacion);
authRoutes.post('/login', limiteAuth, validarBody(loginDto), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requiereAuth, authController.perfil);
