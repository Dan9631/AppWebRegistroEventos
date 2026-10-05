import { FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { ApiError, erroresPorCampo } from '../api/client';
import { authApi, DatosRegistro } from '../api/auth.api';
import { Alerta } from '../components/Alerta';
import { Boton } from '../components/Boton';
import { Campo, CampoPassword } from '../components/Campo';
import { PanelAuth } from '../components/PanelAuth';
import { ReenviarCorreo } from '../components/ReenviarCorreo';
import { limpiarErrores, reglasPassword, requerido, validarEmail, validarPassword } from '../utils/validacion';

const vacio: DatosRegistro & { confirmacion: string } = {
  nombre: '',
  apellidos: '',
  email: '',
  password: '',
  confirmacion: '',
};

export function RegistroPage() {
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [registrado, setRegistrado] = useState<string | null>(null);

  function cambiar(campo: keyof typeof vacio, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo]) setErrores(({ [campo]: _, ...resto }) => resto);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);

    const nuevosErrores = limpiarErrores({
      nombre: requerido(datos.nombre, 'El nombre es requerido'),
      apellidos: requerido(datos.apellidos, 'Los apellidos son requeridos'),
      email: validarEmail(datos.email),
      password: validarPassword(datos.password),
      confirmacion:
        datos.confirmacion !== datos.password ? 'Las contraseñas no coinciden' : undefined,
    });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      const { usuario } = await authApi.registrar({
        nombre: datos.nombre.trim(),
        apellidos: datos.apellidos.trim(),
        email: datos.email.trim(),
        password: datos.password,
      });
      setRegistrado(usuario.email);
    } catch (error) {
      if (error instanceof ApiError && error.codigo === 'EMAIL_REGISTRADO') {
        setErrores({ email: 'Ya existe una cuenta con este email' });
      } else {
        setErrores(erroresPorCampo(error));
        if (error instanceof ApiError && error.codigo !== 'DATOS_INVALIDOS') setErrorGeneral(error.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (registrado) {
    return (
      <div className="centrado">
        <section className="tarjeta tarjeta--estrecha tarjeta--centrada">
          <div className="icono-estado icono-estado--exito" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 6h16v12H4z M4 7l8 6 8-6" />
            </svg>
          </div>
          <h1 className="tarjeta__titulo">Revisa tu correo</h1>
          <p className="tarjeta__subtitulo">
            Enviamos un enlace de confirmación a <strong>{registrado}</strong>. Ábrelo para activar tu cuenta.
          </p>
          <ReenviarCorreo email={registrado} />
          <p className="tarjeta__pie">
            ¿Ya confirmaste? <Link to="/login">Inicia sesión</Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <PanelAuth titulo="Crear cuenta" subtitulo="Regístrate para confirmar tu asistencia y recibir tus promociones.">
      {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}

      <form className="formulario" onSubmit={enviar} noValidate>
        <div className="formulario__fila">
          <Campo
            etiqueta="Nombre"
            name="nombre"
            autoComplete="given-name"
            placeholder="Su nombre"
            value={datos.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            error={errores.nombre}
            autoFocus
          />
          <Campo
            etiqueta="Apellidos"
            name="apellidos"
            autoComplete="family-name"
            placeholder="Sus apellidos"
            value={datos.apellidos}
            onChange={(e) => cambiar('apellidos', e.target.value)}
            error={errores.apellidos}
          />
        </div>
        <Campo
          etiqueta="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Introduzca su email"
          value={datos.email}
          onChange={(e) => cambiar('email', e.target.value)}
          error={errores.email}
        />
        <CampoPassword
          etiqueta="Contraseña"
          name="password"
          autoComplete="new-password"
          placeholder="Cree una contraseña"
          value={datos.password}
          onChange={(e) => cambiar('password', e.target.value)}
          error={errores.password}
          ayuda={
            <ul className="requisitos">
              {reglasPassword.map((regla) => (
                <li
                  key={regla.id}
                  className={regla.cumple(datos.password) ? 'requisitos__item requisitos__item--ok' : 'requisitos__item'}
                >
                  {regla.texto}
                </li>
              ))}
            </ul>
          }
        />
        <CampoPassword
          etiqueta="Confirmar contraseña"
          name="confirmacion"
          autoComplete="new-password"
          placeholder="Repita la contraseña"
          value={datos.confirmacion}
          onChange={(e) => cambiar('confirmacion', e.target.value)}
          error={errores.confirmacion}
        />

        <Boton type="submit" cargando={enviando} textoCargando="Creando cuenta..." conFlecha className="boton--bloque">
          Crear cuenta
        </Boton>
      </form>

      <p className="tarjeta__pie">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </PanelAuth>
  );
}
