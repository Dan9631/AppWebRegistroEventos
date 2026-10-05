import { ButtonHTMLAttributes } from 'react';

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'texto';
  cargando?: boolean;
  textoCargando?: string;
  conFlecha?: boolean;
}

export function Boton({
  variante = 'primario',
  cargando = false,
  textoCargando,
  conFlecha = false,
  children,
  disabled,
  className = '',
  ...resto
}: BotonProps) {
  return (
    <button
      className={`boton boton--${variante} ${className}`.trim()}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando && <span className="spinner spinner--pequeno" aria-hidden="true" />}
      <span>{cargando && textoCargando ? textoCargando : children}</span>
      {conFlecha && !cargando && (
        <svg className="boton__flecha" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      )}
    </button>
  );
}
