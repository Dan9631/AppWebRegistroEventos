import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { estado, usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);
    try {
      await logout();
    } finally {
      setSaliendo(false);
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="app">
      <header className="encabezado">
        <div className="encabezado__contenido">
          <Link to="/" className="marca">
            <span className="marca__nombre">Disagro</span>
            <span className="marca__evento">Feria de Promociones</span>
          </Link>

          {estado === 'autenticado' && usuario && (
            <div className="sesion">
              <span className="sesion__avatar" aria-hidden="true">
                {usuario.nombre.charAt(0).toUpperCase()}
              </span>
              <span className="sesion__nombre">
                {usuario.nombre} {usuario.apellidos}
              </span>
              <button type="button" className="sesion__salir" onClick={cerrarSesion} disabled={saliendo}>
                {saliendo ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="principal">
        <Outlet />
      </main>

      <footer className="pie">
        <div className="pie__contenido">
          <span>© {new Date().getFullYear()} Disagro</span>
          <span>
            Atención al cliente: <a href="tel:22232425">2223-2425</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
