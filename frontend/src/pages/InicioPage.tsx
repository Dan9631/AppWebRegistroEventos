import { useAuth } from '../auth/AuthContext';

/** Página principal con sesión. Aquí irá el formulario de confirmación de asistencia. */
export function InicioPage() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  return (
    <div className="inicio">
      <section className="bienvenida">
        <p className="panel-auth__etiqueta">Feria de Promociones</p>
        <h1 className="bienvenida__titulo">¡Hola, {usuario.nombre}!</h1>
        <p className="bienvenida__texto">
          Confirma tu asistencia y elige los servicios y productos de tu interés para recibir tu portafolio de
          promociones personalizado.
        </p>
      </section>

      <div className="inicio__grid">
        <section className="tarjeta">
          <div className="paso-encabezado">
            <span className="paso-numero">1</span>
            <h2>Tu información</h2>
          </div>
          <dl className="datos">
            <div>
              <dt>Nombre</dt>
              <dd>{usuario.nombre}</dd>
            </div>
            <div>
              <dt>Apellidos</dt>
              <dd>{usuario.apellidos}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{usuario.email}</dd>
            </div>
          </dl>
        </section>

        <section className="tarjeta tarjeta--pendiente">
          <div className="paso-encabezado">
            <span className="paso-numero">2</span>
            <h2>Servicios y productos de tu interés</h2>
          </div>
          <p className="texto-suave">
            Muy pronto podrás seleccionar la fecha de tu visita y los servicios y productos que te interesan.
          </p>
        </section>
      </div>
    </div>
  );
}
