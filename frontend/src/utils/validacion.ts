// Validación del lado del cliente para dar respuesta inmediata.
// Las mismas reglas se validan en el backend, que es quien decide.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(email: string): string | undefined {
  if (!email.trim()) return 'El email es requerido';
  if (!EMAIL_REGEX.test(email.trim())) return 'Ingrese un email válido';
}

export const reglasPassword = [
  { id: 'largo', texto: 'Al menos 8 caracteres', cumple: (p: string) => p.length >= 8 && p.length <= 72 },
  { id: 'letra', texto: 'Al menos una letra', cumple: (p: string) => /[A-Za-z]/.test(p) },
  { id: 'numero', texto: 'Al menos un número', cumple: (p: string) => /\d/.test(p) },
];

export function validarPassword(password: string): string | undefined {
  if (!password) return 'La contraseña es requerida';
  const fallida = reglasPassword.find((regla) => !regla.cumple(password));
  if (fallida) return `La contraseña debe tener: ${fallida.texto.toLowerCase()}`;
}

export function requerido(valor: string, mensaje: string): string | undefined {
  if (!valor.trim()) return mensaje;
}

/** Quita las claves sin error para saber si el formulario es válido. */
export function limpiarErrores(errores: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(errores).filter(([, v]) => v)) as Record<string, string>;
}
