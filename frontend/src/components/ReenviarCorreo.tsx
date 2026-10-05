import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { authApi } from '../api/auth.api';
import { Boton } from './Boton';

const ESPERA_SEGUNDOS = 60;

/** Botón para reenviar el correo de confirmación, con espera entre envíos. */
export function ReenviarCorreo({ email, variante = 'secundario' }: { email: string; variante?: 'secundario' | 'texto' }) {
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  async function reenviar() {
    setEnviando(true);
    setMensaje(null);
    try {
      await authApi.reenviarVerificacion(email);
      setMensaje({ tipo: 'exito', texto: 'Te enviamos un nuevo correo. Revisa también la carpeta de spam.' });
      setEspera(ESPERA_SEGUNDOS);
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: error instanceof ApiError ? error.message : 'No se pudo reenviar el correo',
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
      {mensaje && (
        <p className={`reenviar__mensaje reenviar__mensaje--${mensaje.tipo}`} role="status">
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
