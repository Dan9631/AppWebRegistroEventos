import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { authApi } from '../api/auth.api';
import { Boton } from './Boton';
import { useNotificar } from './Notificaciones';

const ESPERA_SEGUNDOS = 60;

/** Botón para reenviar el correo de confirmación, con espera entre envíos. */
export function ReenviarCorreo({ email, variante = 'secundario' }: { email: string; variante?: 'secundario' | 'texto' }) {
  const notificar = useNotificar();
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  async function reenviar() {
    setEnviando(true);
    try {
      await authApi.reenviarVerificacion(email);
      notificar({
        tipo: 'exito',
        titulo: 'Correo enviado',
        mensaje: `Revisa la bandeja de ${email} y también la carpeta de spam.`,
      });
      setEspera(ESPERA_SEGUNDOS);
    } catch (error) {
      notificar({
        tipo: 'error',
        titulo: 'No se pudo reenviar',
        mensaje: error instanceof ApiError ? error.message : 'Intenta de nuevo en unos minutos.',
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="reenviar">
      <Boton
        type="button"
        variante={variante}
        onClick={reenviar}
        cargando={enviando}
        textoCargando="Enviando..."
        disabled={espera > 0}
      >
        {espera > 0 ? `Reenviar en ${espera}s` : 'Reenviar correo de confirmación'}
      </Boton>
    </div>
  );
}
