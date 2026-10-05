export interface DetalleError {
  campo: string;
  mensaje: string;
}

/** Error normalizado de la API: { error: { codigo, mensaje, detalles? } } */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles: DetalleError[] = [],
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

interface Opciones {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

/** Petición HTTP base. Las URL son relativas: el frontend y la API comparten origen. */
export async function request<T>(ruta: string, { method = 'GET', body, token }: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'SIN_CONEXION', 'No se pudo conectar con el servidor. Verifique su conexión.');
  }

  if (respuesta.status === 204) return undefined as T;

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      datos?.error?.codigo ?? 'ERROR_DESCONOCIDO',
      datos?.error?.mensaje ?? 'Ocurrió un error inesperado',
      datos?.error?.detalles ?? [],
    );
  }
  return datos as T;
}

/** Convierte los detalles de validación del backend en { campo: mensaje } para los formularios. */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.detalles.map((d) => [d.campo, d.mensaje]));
}
