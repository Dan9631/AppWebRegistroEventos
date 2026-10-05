export type TipoNotificacion = 'exito' | 'error' | 'info' | 'aviso';

const trazos: Record<TipoNotificacion, string> = {
  exito: 'M5 12.5l4.5 4.5L19 7.5',
  error: 'M7 7l10 10M17 7L7 17',
  info: 'M12 11v6M12 7.5v.5',
  aviso: 'M12 7v6M12 16.5v.5',
};

/** Círculo con el color del tipo de notificación (lo toma de --tinte del vidrio). */
export function IconoNotificacion({ tipo }: { tipo: TipoNotificacion }) {
  return (
    <span className="icono-notificacion" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={trazos[tipo]} />
      </svg>
    </span>
  );
}
