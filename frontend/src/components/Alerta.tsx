import { ReactNode } from 'react';

interface AlertaProps {
  tipo: 'error' | 'exito' | 'info';
  titulo?: string;
  children: ReactNode;
  accion?: ReactNode;
}

export function Alerta({ tipo, titulo, children, accion }: AlertaProps) {
  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <div className="alerta__texto">
        {titulo && <strong className="alerta__titulo">{titulo}</strong>}
        <div>{children}</div>
      </div>
      {accion && <div className="alerta__accion">{accion}</div>}
    </div>
  );
}
