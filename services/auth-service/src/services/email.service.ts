import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env';

interface Correo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

/** Proveedor de envío. Cada uno decide cómo entregar el correo; el resto del servicio no lo sabe. */
interface ProveedorCorreo {
  nombre: string;
  enviar(correo: Correo): Promise<void>;
}

/**
 * Gmail por SMTP con una contraseña de aplicación. Permite enviar a cualquier destinatario,
 * con un límite aproximado de 500 correos al día en cuentas personales.
 */
function crearGmail(usuario: string, password: string): ProveedorCorreo {
  const transporte = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: usuario, pass: password },
  });

  // Se comprueban las credenciales al arrancar para detectar en el log una contraseña
  // mal copiada, en lugar de descubrirlo con el primer registro.
  transporte
    .verify()
    .then(() => console.info(`[email] Gmail listo para enviar como ${usuario}`))
    .catch((error: Error) => console.error(`[email] Gmail rechazó las credenciales de ${usuario}: ${error.message}`));

  return {
    nombre: 'Gmail',
    async enviar(correo) {
      // Gmail exige que el remitente sea la propia cuenta autenticada.
      await transporte.sendMail({
        from: { name: env.EMAIL_NOMBRE_REMITENTE, address: usuario },
        to: correo.para,
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      });
    },
  };
}

/** Resend: requiere un dominio verificado para enviar a destinatarios distintos del dueño de la cuenta. */
function crearResend(apiKey: string): ProveedorCorreo {
  const resend = new Resend(apiKey);
  return {
    nombre: 'Resend',
    async enviar(correo) {
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: correo.para,
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      });
      if (error) throw new Error(error.message);
    },
  };
}

function crearProveedor(): ProveedorCorreo | null {
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) return crearGmail(env.GMAIL_USER, env.GMAIL_APP_PASSWORD);
  if (env.RESEND_API_KEY) return crearResend(env.RESEND_API_KEY);
  return null;
}

const proveedor = crearProveedor();
console.info(`[email] Proveedor de correo: ${proveedor?.nombre ?? 'ninguno (los enlaces solo se escriben en el log)'}`);

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

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

// Versión en texto plano: algunos clientes de correo la muestran y ayuda a no caer en spam.
function textoVerificacion(nombre: string, enlace: string, horas: number): string {
  return [
    `Hola ${nombre},`,
    '',
    'Gracias por registrarte en la Feria de Promociones de Disagro.',
    'Para activar tu cuenta confirma tu correo abriendo este enlace:',
    '',
    enlace,
    '',
    `El enlace vence en ${horas} horas. Si no creaste esta cuenta, ignora este mensaje.`,
  ].join('\n');
}

export const emailService = {
  async enviarVerificacion(destino: { email: string; nombre: string }, token: string): Promise<void> {
    const enlace = `${env.FRONTEND_URL}/verificar?token=${encodeURIComponent(token)}`;

    // En desarrollo el enlace también se muestra en el log para probar sin depender del correo.
    if (env.NODE_ENV !== 'production') {
      console.info(`[email] Enlace de verificación para ${destino.email}: ${enlace}`);
    }

    if (!proveedor) return;

    try {
      await proveedor.enviar({
        para: destino.email,
        asunto: 'Confirma tu correo - Feria de Promociones Disagro',
        html: plantillaVerificacion(destino.nombre, enlace, env.VERIFICACION_TTL_HORAS),
        texto: textoVerificacion(destino.nombre, enlace, env.VERIFICACION_TTL_HORAS),
      });
      console.info(`[email] Correo de verificación enviado a ${destino.email} (${proveedor.nombre})`);
    } catch (error) {
      // No se interrumpe el registro: el usuario puede pedir el reenvío del correo.
      console.error(`[email] Error al enviar con ${proveedor.nombre}:`, error instanceof Error ? error.message : error);
    }
  },
};
