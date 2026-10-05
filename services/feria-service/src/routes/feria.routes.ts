import { Router } from 'express';
import { feriaController } from '../controllers/feria.controller';
import { confirmacionDto } from '../dtos/feria.dto';
import { requiereAuth, requiereEmailVerificado, requiereTipo } from '../middlewares/auth.middleware';
import { validarBody } from '../middlewares/validar.middleware';

export const feriaRoutes = Router();

// Públicas: el formulario las necesita para pintarse
feriaRoutes.get('/evento', feriaController.evento);
feriaRoutes.get('/items', feriaController.items);

// Solo clientes con sesión
feriaRoutes.get('/confirmaciones/mia', requiereAuth, requiereTipo('CLIENTE'), feriaController.miConfirmacion);
feriaRoutes.post(
  '/confirmaciones',
  requiereAuth,
  requiereTipo('CLIENTE'),
  requiereEmailVerificado,
  validarBody(confirmacionDto),
  feriaController.confirmar,
);
