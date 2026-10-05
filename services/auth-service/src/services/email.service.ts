import { Resend } from 'resend';
import { env } from '../config/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function plantillaVerificacion(nombre: string, enlace: string, horas: number): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #222;">
    <div style="background: #3d3d3d; color: #fff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 24px;">Disagro</h1>
      <p style="margin: 4px 0 0;">Feria de Promociones</p>
    </div>
    <div style="padding: 24px; border: 1px solid #e5e5e5; border-top: none;">
      <p>Hola ${escaparHtml(nombre)},</p>
      <p>Gracias por registrarte. Para activar tu cuenta confirma tu correo electrónico:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${enlace}" style="background: #4a4ae0; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Confirmar correo
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">El enlace vence en ${horas} horas. Si no creaste esta cuenta, ignora este mensaje.</p>
    </div>
  </div>`;
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export const emailService = {
  async enviarVerificacion(destino: { email: string; nombre: string }, token: string): Promise<void> {
    const enlace = `${env.FRONTEND_URL}/verificar?token=${encodeURIComponent(token)}`;

    // En desarrollo el enlace también se muestra en el log para probar sin depender de Resend.
    if (env.NODE_ENV !== 'production') {
      console.info(`[email] Enlace de verificación para ${destino.email}: ${enlace}`);
    }

    if (!resend) {
      console.warn('[email] RESEND_API_KEY no configurada: el correo no se envió');
      return;
    }

    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: destino.email,
      subject: 'Confirma tu correo - Feria de Promociones Disagro',
      html: plantillaVerificacion(destino.nombre, enlace, env.VERIFICACION_TTL_HORAS),
    });

    // No se interrumpe el registro: el usuario puede pedir el reenvío del correo.
    if (error) {
      console.error('[email] Error al enviar con Resend:', error);
    }
  },
};
