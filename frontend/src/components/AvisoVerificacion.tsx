import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Boton } from './Boton';
import { ReenviarCorreo } from './ReenviarCorreo';

/** Aviso fijo bajo el encabezado mientras el cliente no confirme su correo. */
export function AvisoVerificacion() {
  const { usuario, actualizarSesion } = useAuth();
  const [revisando, setRevisando] = useState(false);
  const [aunPendiente, setAunPendiente] = useState(false);

  if (!usuario || usuario.emailVerificado) return null;

  async function yaLoConfirme() {
    setRevisando(true);
    setAunPendiente(false);
    try {
      const actualizado = await actualizarSesion();
      if (actualizado && !actualizado.emailVerificado) setAunPendiente(true);
    } finally {
      setRevisando(false);
    }
  }

  return (
    <div className="aviso-verificacion" role="status">
      <div className="aviso-verificacion__contenido">
        <div className="aviso-verificacion__texto">
          <strong>Confirma tu correo para poder confirmar tu asistencia.</strong>
          <span>
            Enviamos un enlace a <strong>{usuario.email}</strong>. Mientras tanto puedes explorar los servicios y
            productos.
          </span>
          {aunPendiente && (
            <span className="aviso-verificacion__pendiente">
              Aún no vemos tu correo confirmado. Abre el enlace del correo e inténtalo de nuevo.
            </span>
          )}
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
