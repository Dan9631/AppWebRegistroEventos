import { z } from 'zod';

const email = z
  .email('Email inválido')
  .max(255)
  .transform((valor) => valor.trim().toLowerCase());

export const registroDto = z.object({
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(100),
  apellidos: z.string().trim().min(1, 'Los apellidos son requeridos').max(100),
  email,
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede exceder 72 caracteres') // límite de bcrypt
    .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
    .regex(/\d/, 'La contraseña debe incluir al menos un número'),
});

export const loginDto = z.object({
  email,
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const verificarDto = z.object({
  token: z.string().min(1, 'El token es requerido'),
});

export const reenviarVerificacionDto = z.object({
  email,
});

export type RegistroDto = z.infer<typeof registroDto>;
export type LoginDto = z.infer<typeof loginDto>;
export type VerificarDto = z.infer<typeof verificarDto>;
export type ReenviarVerificacionDto = z.infer<typeof reenviarVerificacionDto>;
