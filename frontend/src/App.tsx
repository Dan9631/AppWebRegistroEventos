import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { RutaProtegida, RutaSoloAnonimo } from './auth/Rutas';
import { Layout } from './components/Layout';
import { InicioPage } from './pages/InicioPage';
import { LoginPage } from './pages/LoginPage';
import { NoEncontradoPage } from './pages/NoEncontradoPage';
import { RegistroPage } from './pages/RegistroPage';
import { VerificarPage } from './pages/VerificarPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route element={<RutaSoloAnonimo />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegistroPage />} />
            </Route>

            {/* Accesible con o sin sesión: se llega desde el enlace del correo */}
            <Route path="/verificar" element={<VerificarPage />} />

            <Route element={<RutaProtegida />}>
              <Route path="/" element={<InicioPage />} />
            </Route>

            <Route path="*" element={<NoEncontradoPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
