import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Boton } from './Boton';
import { IconoNotificacion } from './IconoNotificacion';
import { useNotificar } from './Notificaciones';
import { ReenviarCorreo } from './ReenviarCorreo';

/** Aviso de vidrio, fijo bajo el encabezado, mientras el cliente no confirme su correo. */
export function AvisoVerificacion() {
  const { usuario, actualizarSesion } = useAuth();
  const notificar = useNotificar();
  const [revisando, setRevisando] = useState(false);

  if (!usuario || usuario.emailVerificado) return null;

  async function yaLoConfirme() {
    setRevisando(true);
    try {
      const actualizado = await actualizarSesion();
      if (actualizado?.emailVerificado) {
        notificar({ tipo: 'exito', titulo: '¡Correo confirmado!', mensaje: 'Ya puedes confirmar tu asistencia.' });
      } else if (actualizado) {
        notificar({
          tipo: 'aviso',
          titulo: 'Aún no está confirmado',
          mensaje: 'Abre el enlace del correo que te enviamos e inténtalo de nuevo.',
        });
      }
    } finally {
      setRevisando(false);
    }
  }

  return (
    <div className="aviso-verificacion vidrio vidrio--aviso" role="status">
      <div className="aviso-verificacion__contenido">
        <div className="aviso-verificacion__mensaje">
          <IconoNotificacion tipo="aviso" />
          <div className="aviso-verificacion__texto">
            <strong>Confirma tu correo para poder confirmar tu asistencia.</strong>
            <span>
              Enviamos un enlace a <strong>{usuario.email}</strong>. Mientras tanto puedes explorar los servicios y
              productos.
            </span>
          </div>
        </div>
        <div className="aviso-verificacion__acciones">
          <Boton variante="secundario" onClick={yaLoConfirme} cargando={revisando} textoCargando="Revisando...">
            Ya lo confirmé
          </Boton>
          <ReenviarCorreo email={usuario.email} variante="texto" />
        </div>
      </div>
    </div>
  );
}
