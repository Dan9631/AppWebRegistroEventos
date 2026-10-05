import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, refrescarSesion, registrarAlExpirarSesion, Usuario } from '../api/auth.api';

type EstadoSesion = 'cargando' | 'autenticado' | 'anonimo';

interface AuthContextValue {
  estado: EstadoSesion;
  usuario: Usuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const cerrarLocalmente = useCallback(() => {
    setUsuario(null);
    setEstado('anonimo');
  }, []);

  // Al cargar la app se intenta recuperar la sesión con la cookie del refresh token.
  useEffect(() => {
    registrarAlExpirarSesion(cerrarLocalmente);
    refrescarSesion().then((recuperado) => {
      setUsuario(recuperado);
      setEstado(recuperado ? 'autenticado' : 'anonimo');
    });
  }, [cerrarLocalmente]);

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

  const valor = useMemo(() => ({ estado, usuario, login, logout }), [estado, usuario, login, logout]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
