import { ReactNode } from 'react';

const pasos = [
  { titulo: 'Crea tu cuenta', texto: 'Regístrate con tu correo y confírmalo desde tu bandeja de entrada.' },
  { titulo: 'Confirma tu asistencia', texto: 'Elige la fecha y hora en que nos visitarás en la feria.' },
  { titulo: 'Elige lo que te interesa', texto: 'Selecciona servicios y productos y obtén hasta 5% de descuento.' },
];

/** Plantilla de dos columnas para login y registro: información del evento + formulario. */
export function PanelAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="panel-auth">
      <section className="panel-auth__info" aria-label="Cómo funciona">
        <p className="panel-auth__etiqueta">Evento anual de promociones</p>
        <h1 className="panel-auth__titular">Arma tu portafolio de promociones personalizado</h1>
        <ol className="pasos">
          {pasos.map((paso, i) => (
            <li key={paso.titulo} className="pasos__item">
              <span className="paso-numero">{i + 1}</span>
              <div>
                <strong>{paso.titulo}</strong>
                <p>{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="tarjeta panel-auth__formulario">
        <h2 className="tarjeta__titulo">{titulo}</h2>
        <p className="tarjeta__subtitulo">{subtitulo}</p>
        {children}
      </section>
    </div>
  );
}
