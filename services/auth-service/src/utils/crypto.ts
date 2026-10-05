import { createHash, randomBytes } from 'node:crypto';

/** Token aleatorio para enviar al usuario (correo o cookie). Nunca se guarda en claro. */
export function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash SHA-256 en hex (64 caracteres): es lo único que se persiste. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
