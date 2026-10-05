import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useId, useState } from 'react';

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
}

export function Campo({ etiqueta, error, ayuda, ...input }: CampoProps) {
  const id = useId();

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      <input
        id={id}
        className={`campo__input${error ? ' campo__input--error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, ayuda)}
        {...input}
      />
      <MensajesCampo id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

type CampoPasswordProps = Omit<CampoProps, 'type'>;

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function CampoPassword({ etiqueta, error, ayuda, ...input }: CampoPasswordProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      <div className="campo__grupo">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className={`campo__input campo__input--con-accion${error ? ' campo__input--error' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, ayuda)}
          {...input}
        />
        <button
          type="button"
          className="campo__accion"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      <MensajesCampo id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

interface CampoSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  error?: string;
  ayuda?: ReactNode;
  opciones: { valor: string; etiqueta: string }[];
  placeholder: string;
}

export function CampoSelect({ etiqueta, error, ayuda, opciones, placeholder, ...select }: CampoSelectProps) {
  const id = useId();

  return (
    <div className="campo">
      <label htmlFor={id} className="campo__etiqueta">
        {etiqueta}
      </label>
      <select
        id={id}
        className={`campo__input campo__select${error ? ' campo__input--error' : ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, ayuda)}
        {...select}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      <MensajesCampo id={id} error={error} ayuda={ayuda} />
    </div>
  );
}

function describedBy(id: string, error?: string, ayuda?: ReactNode): string | undefined {
  const ids = [error && `${id}-error`, ayuda && `${id}-ayuda`].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** El error y la ayuda se muestran juntos: la ayuda (p. ej. requisitos) sirve más cuando hay error. */
function MensajesCampo({ id, error, ayuda }: { id: string; error?: string; ayuda?: ReactNode }) {
  return (
    <>
      {error && (
        <p id={`${id}-error`} className="campo__error">
          {error}
        </p>
      )}
      {ayuda && (
        <div id={`${id}-ayuda`} className="campo__ayuda">
          {ayuda}
        </div>
      )}
    </>
  );
}
