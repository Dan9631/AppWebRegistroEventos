import rateLimit from 'express-rate-limit';

const respuesta = {
  error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Demasiados intentos, intente más tarde' },
};

/** Login y registro: frena ataques de fuerza bruta. */
export const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: respuesta,
});

/** Reenvío de correo: evita usar el servicio para enviar spam. */
export const limiteCorreo = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: respuesta,
});
