// Error de negocio con código estable para que el frontend pueda reaccionar sin leer el mensaje.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'AppError';
  }
}
