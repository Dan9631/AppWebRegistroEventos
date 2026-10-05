import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IconoNotificacion, TipoNotificacion } from './IconoNotificacion';

interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  titulo?: string;
  mensaje: string;
  saliendo: boolean;
}

type Notificar = (datos: { tipo: TipoNotificacion; titulo?: string; mensaje: string; duracionMs?: number }) => void;

const NotificacionesContext = createContext<Notificar | null>(null);

const DURACION_MS = 5000;
const SALIDA_MS = 220; // igual a la animación toast-salida del CSS
const MAXIMO_VISIBLES = 3;

/** Notificaciones flotantes de vidrio para avisos breves (correo reenviado, sesión cerrada...). */
export function NotificacionesProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Notificacion[]>([]);
  const siguienteId = useRef(1);
  const temporizadores = useRef(new Map<number, number>());

  const cerrar = useCallback((id: number) => {
    // Primero se marca para que corra la animación de salida y luego se quita.
    setLista((actual) => actual.map((n) => (n.id === id ? { ...n, saliendo: true } : n)));
    window.setTimeout(() => setLista((actual) => actual.filter((n) => n.id !== id)), SALIDA_MS);
    window.clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
  }, []);

  const notificar = useCallback<Notificar>(
    ({ tipo, titulo, mensaje, duracionMs = DURACION_MS }) => {
      const id = siguienteId.current++;
      setLista((actual) => [...actual, { id, tipo, titulo, mensaje, saliendo: false }].slice(-MAXIMO_VISIBLES));
      temporizadores.current.set(id, window.setTimeout(() => cerrar(id), duracionMs));
    },
    [cerrar],
  );

  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => pendientes.forEach((t) => window.clearTimeout(t));
  }, []);

  const valor = useMemo(() => notificar, [notificar]);

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <div className="toasts" role="region" aria-label="Notificaciones" aria-live="polite">
        {lista.map((n) => (
          <div
            key={n.id}
            className={`toast vidrio vidrio--${n.tipo}${n.saliendo ? ' toast--saliendo' : ''}`}
            role={n.tipo === 'error' ? 'alert' : 'status'}
          >
            <IconoNotificacion tipo={n.tipo} />
            <div className="toast__texto">
              {n.titulo && <strong>{n.titulo}</strong>}
              <span>{n.mensaje}</span>
            </div>
            <button type="button" className="toast__cerrar" onClick={() => cerrar(n.id)} aria-label="Cerrar notificación">
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  );
}

export function useNotificar(): Notificar {
  const contexto = useContext(NotificacionesContext);
  if (!contexto) throw new Error('useNotificar debe usarse dentro de <NotificacionesProvider>');
  return contexto;
}
