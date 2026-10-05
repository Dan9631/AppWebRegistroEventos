import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, refrescarSesion, registrarAlExpirarSesion, Usuario } from '../api/auth.api';

type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo';

interface AuthContextValue {
  estado: EstadoSesion;
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Pide un token nuevo para reflejar cambios de la cuenta, p. ej. el correo recién confirmado. */
  actualizarSesion: () => Promise<Usuario | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const cerrarLocalmente = useCallback(() => {
    setUsuario(null);
    setEstado('anonimo');
  }, []);

  const actualizarSesion = useCallback(async () => {
    const actualizado = await refrescarSesion();
    setUsuario(actualizado);
    setEstado(actualizado ? 'autenticado' : 'anonimo');
    return actualizado;
  }, []);

  // Al cargar la app se intenta recuperar la sesión con la cookie del refresh token.
  useEffect(() => {
    registrarAlExpirarSesion(cerrarLocalmente);
    actualizarSesion();
  }, [cerrarLocalmente, actualizarSesion]);

  // Si el correo está sin confirmar, al volver a la página se revisa de nuevo: lo normal es
  // que el cliente lo haya confirmado desde el enlace en otra pestaña o desde su app de correo.
  // Si ambos eventos llegan juntos no pasa nada: refrescarSesion comparte la petición en curso.
  const pendienteDeConfirmar = estado === 'autenticado' && usuario?.emailVerificado === false;
  useEffect(() => {
    if (!pendienteDeConfirmar) return;
    const alVolver = () => {
      if (document.visibilityState === 'visible') actualizarSesion();
    };
    document.addEventListener('visibilitychange', alVolver); // cambio de pestaña
    window.addEventListener('focus', alVolver); // regreso desde otra ventana o aplicación
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [pendienteDeConfirmar, actualizarSesion]);

  const login = useCallback(async (email: string, password: string) => {
    setUsuario(await authApi.login(email, password));
    setEstado('autenticado');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      cerrarLocalmente();
    }
  }, [cerrarLocalmente]);

  const valor = useMemo(
    () => ({ estado, usuario, login, logout, actualizarSesion }),
    [estado, usuario, login, logout, actualizarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
