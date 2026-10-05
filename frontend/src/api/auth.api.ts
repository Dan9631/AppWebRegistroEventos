import { ApiError, request } from './client';

export interface Usuario {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  tipo: string;
  emailVerificado: boolean;
}

interface Sesion {
  accessToken: string;
  usuario: Usuario;
}

export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  email: string;
  password: string;
}

// El access token vive solo en memoria: un script inyectado no puede leerlo de localStorage.
// Al recargar la página se recupera con la cookie httpOnly del refresh token.
let accessToken: string | null = null;
let refreshEnCurso: Promise<Usuario | null> | null = null;
let alExpirarSesion: () => void = () => {};

export function registrarAlExpirarSesion(callback: () => void) {
  alExpirarSesion = callback;
}

function guardarSesion(sesion: Sesion): Usuario {
  accessToken = sesion.accessToken;
  return sesion.usuario;
}

/**
 * Renueva la sesión con la cookie. Si se pide varias veces a la vez (p. ej. dos peticiones
 * que reciben 401, o el doble montaje de StrictMode) se comparte la misma petición:
 * enviar dos veces el mismo refresh token haría que el backend lo trate como robado
 * y cierre todas las sesiones.
 */
export function refrescarSesion(): Promise<Usuario | null> {
  refreshEnCurso ??= request<Sesion>('/auth/refresh', { method: 'POST' })
    .then(guardarSesion)
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshEnCurso = null;
    });
  return refreshEnCurso;
}

/** Petición autenticada: si el access token venció, renueva la sesión y reintenta una vez. */
export async function requestAutenticado<T>(ruta: string, opciones: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  try {
    return await request<T>(ruta, { ...opciones, token: accessToken });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;

    const usuario = await refrescarSesion();
    if (!usuario) {
      alExpirarSesion();
      throw error;
    }
    return request<T>(ruta, { ...opciones, token: accessToken });
  }
}

export const authApi = {
  registrar(datos: DatosRegistro) {
    return request<{ mensaje: string; usuario: Usuario }>('/auth/registro', { method: 'POST', body: datos });
  },

  verificar(token: string) {
    return request<{ mensaje: string }>('/auth/verificar', { method: 'POST', body: { token } });
  },

  reenviarVerificacion(email: string) {
    return request<{ mensaje: string }>('/auth/reenviar-verificacion', { method: 'POST', body: { email } });
  },

  async login(email: string, password: string): Promise<Usuario> {
    return guardarSesion(await request<Sesion>('/auth/login', { method: 'POST', body: { email, password } }));
  },

  async logout(): Promise<void> {
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      accessToken = null;
    }
  },

  perfil() {
    return requestAutenticado<{ usuario: Usuario }>('/auth/me');
  },
};
