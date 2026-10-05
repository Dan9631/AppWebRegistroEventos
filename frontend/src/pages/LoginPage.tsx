import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ApiError, erroresPorCampo } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Alerta } from '../components/Alerta';
import { Boton } from '../components/Boton';
import { Campo, CampoPassword } from '../components/Campo';
import { PanelAuth } from '../components/PanelAuth';
import { limpiarErrores, requerido, validarEmail } from '../utils/validacion';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { desde?: string } | null)?.desde ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<ApiError | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);

    const nuevosErrores = limpiarErrores({
      email: validarEmail(email),
      password: requerido(password, 'La contraseña es requerida'),
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await login(email.trim(), password);
      navigate(destino, { replace: true });
    } catch (error) {
      setErrores(erroresPorCampo(error));
      if (error instanceof ApiError) setErrorGeneral(error);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PanelAuth titulo="Iniciar sesión" subtitulo="Ingresa para confirmar tu asistencia a la feria.">
      {errorGeneral && errorGeneral.codigo !== 'DATOS_INVALIDOS' && (
        <Alerta tipo="error">{errorGeneral.message}</Alerta>
      )}

      <form className="formulario" onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Introduzca su email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
          autoFocus
        />
        <CampoPassword
          etiqueta="Contraseña"
          name="password"
          autoComplete="current-password"
          placeholder="Introduzca su contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
        />

        <Boton type="submit" cargando={enviando} textoCargando="Ingresando..." conFlecha className="boton--bloque">
          Iniciar sesión
        </Boton>
      </form>

      <p className="tarjeta__pie">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </PanelAuth>
  );
}
