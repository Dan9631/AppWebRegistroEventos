import { ReactNode } from 'react';
import { IconoNotificacion, TipoNotificacion } from './IconoNotificacion';

interface AlertaProps {
  tipo: TipoNotificacion;
  titulo?: string;
  children: ReactNode;
  accion?: ReactNode;
}

export function Alerta({ tipo, titulo, children, accion }: AlertaProps) {
  return (
    <div className={`alerta vidrio vidrio--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <IconoNotificacion tipo={tipo} />
      <div className="alerta__cuerpo">
        {titulo && <strong className="alerta__titulo">{titulo}</strong>}
        <div>{children}</div>
        {accion && <div className="alerta__accion">{accion}</div>}
      </div>
    </div>
  );
}
