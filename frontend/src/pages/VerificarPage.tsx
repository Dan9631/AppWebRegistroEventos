import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '../api/client';
import { authApi } from '../api/auth.api';
import { useAuth } from '../auth/AuthContext';
import { Boton } from '../components/Boton';
import { Campo } from '../components/Campo';
import { Cargando } from '../components/Cargando';
import { ReenviarCorreo } from '../components/ReenviarCorreo';
import { validarEmail } from '../utils/validacion';

type Estado = { tipo: 'verificando' } | { tipo: 'exito' } | { tipo: 'error'; codigo: string; mensaje: string };

/** Destino del enlace enviado por correo: /verificar?token=... */
export function VerificarPage() {
  const [params] = useSearchParams();
  const { estado: sesion, actualizarSesion } = useAuth();
  const token = params.get('token');
  const [estado, setEstado] = useState<Estado>(
    token
      ? { tipo: 'verificando' }
      : { tipo: 'error', codigo: 'SIN_TOKEN', mensaje: 'El enlace no es válido. Asegúrate de abrirlo completo desde el correo.' },
  );

  // El token es de un solo uso. En desarrollo StrictMode ejecuta los efectos dos veces,
  // y la segunda llamada respondería "ya fue utilizado"; la referencia lo evita.
  const yaEnviado = useRef(false);

  useEffect(() => {
    if (!token || yaEnviado.current) return;
    yaEnviado.current = true;

    authApi
      .verificar(token)
      .then(() => setEstado({ tipo: 'exito' }))
      .catch((error) =>
        setEstado({
          tipo: 'error',
          codigo: error instanceof ApiError ? error.codigo : 'ERROR',
          mensaje: error instanceof ApiError ? error.message : 'No se pudo verificar el correo',
        }),
      );
  }, [token]);

  // Si el cliente tiene la sesión abierta, su token aún dice "sin confirmar": se renueva.
  useEffect(() => {
    if (estado.tipo === 'exito' && sesion === 'autenticado') actualizarSesion();
  }, [estado.tipo, sesion, actualizarSesion]);

  if (estado.tipo === 'verificando') {
    return (
      <div className="centrado">
        <Cargando texto="Confirmando tu correo..." />
      </div>
    );
  }

  if (estado.tipo === 'exito') {
    return (
      <div className="centrado">
        <section className="tarjeta tarjeta--estrecha tarjeta--centrada">
          <div className="icono-estado icono-estado--exito" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 className="tarjeta__titulo">¡Correo confirmado!</h1>
          <p className="tarjeta__subtitulo">Tu cuenta está activa. Ya puedes confirmar tu asistencia a la feria.</p>
          {sesion === 'autenticado' ? (
            <Link to="/" className="boton boton--primario boton--bloque">
              <span>Ir a la feria</span>
            </Link>
          ) : (
            <Link to="/login" className="boton boton--primario boton--bloque">
              <span>Iniciar sesión</span>
            </Link>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="centrado">
      <section className="tarjeta tarjeta--estrecha tarjeta--centrada">
        <div className="icono-estado icono-estado--error" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 7v6M12 16.5v.5" />
          </svg>
        </div>
        <h1 className="tarjeta__titulo">
          {estado.codigo === 'TOKEN_VERIFICACION_EXPIRADO' ? 'El enlace expiró' : 'No pudimos confirmar tu correo'}
        </h1>
        <p className="tarjeta__subtitulo">{estado.mensaje}</p>
        <SolicitarNuevoEnlace />
        <p className="tarjeta__pie">
          ¿Ya confirmaste tu correo? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </div>
  );
}

/** Pide el email para enviar un enlace nuevo (el token no indica a quién pertenece). */
function SolicitarNuevoEnlace() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [confirmado, setConfirmado] = useState<string | null>(null);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validarEmail(email);
    setError(problema);
    if (!problema) setConfirmado(email.trim());
  }

  if (confirmado) return <ReenviarCorreo email={confirmado} />;

  return (
    <form className="formulario formulario--compacto" onSubmit={enviar} noValidate>
      <Campo
        etiqueta="Solicita un nuevo enlace"
        type="email"
        autoComplete="email"
        placeholder="Introduzca su email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <Boton type="submit" variante="secundario" className="boton--bloque">
        Continuar
      </Boton>
    </form>
  );
}
