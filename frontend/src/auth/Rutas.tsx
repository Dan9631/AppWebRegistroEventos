import { Navigate, Outlet, useLocation } from 'react-router';
import { Cargando } from '../components/Cargando';
import { useAuth } from './AuthContext';

/** Solo usuarios con sesión. Si no hay sesión, envía al login y recuerda a dónde iba. */
export function RutaProtegida() {
  const { estado } = useAuth();
  const location = useLocation();

  if (estado === 'cargando') return <Cargando texto="Verificando sesión..." />;
  if (estado === 'anonimo') return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  return <Outlet />;
}

/** Login y registro: si ya hay sesión no tiene sentido mostrarlos. */
export function RutaSoloAnonimo() {
  const { estado } = useAuth();

  if (estado === 'cargando') return <Cargando texto="Verificando sesión..." />;
  if (estado === 'autenticado') return <Navigate to="/" replace />;
  return <Outlet />;
}
