import { useEffect, useState } from 'react';
import { Evento, feriaApi } from '../api/feria.api';

// Una sola petición por carga de la app, compartida entre el encabezado, el pie y el formulario.
let eventoEnCurso: Promise<Evento | null> | null = null;

function cargarEvento(): Promise<Evento | null> {
  eventoEnCurso ??= feriaApi.evento().catch(() => {
    eventoEnCurso = null; // permite reintentar en la siguiente navegación
    return null;
  });
  return eventoEnCurso;
}

export function useEvento(): { evento: Evento | null; cargando: boolean } {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    cargarEvento().then((resultado) => {
      if (!activo) return;
      setEvento(resultado);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  return { evento, cargando };
}
