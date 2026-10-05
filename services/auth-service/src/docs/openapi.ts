import { z } from 'zod';
import { loginDto, reenviarVerificacionDto, registroDto, verificarDto } from '../dtos/auth.dto';

// Los esquemas de entrada salen de los mismos DTOs de Zod que validan las peticiones,
// así la documentación no se desfasa de la validación real.
function desdeZod(esquema: z.ZodType) {
  const { $schema: _omitido, ...jsonSchema } = z.toJSONSchema(esquema, { io: 'input' });
  return jsonSchema;
}

function cuerpoJson(ref: string, ejemplo: unknown) {
  return {
    required: true,
    content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` }, example: ejemplo } },
  };
}

function respuestaError(descripcion: string, ...codigos: string[]) {
  return {
    description: `${descripcion}. Códigos posibles: ${codigos.map((c) => `\`${c}\``).join(', ')}`,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { error: { codigo: codigos[0], mensaje: descripcion } },
      },
    },
  };
}

const respuestaMensaje = (descripcion: string) => ({
  description: descripcion,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Mensaje' } } },
});

const respuestaSesion = {
  description:
    'Sesión iniciada. El refresh token se entrega en la cookie `refresh_token` (httpOnly, path `/auth`).',
  headers: {
    'Set-Cookie': { schema: { type: 'string' }, description: 'refresh_token=...; Path=/auth; HttpOnly' },
  },
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Sesion' } } },
};

const errorDatosInvalidos = respuestaError('Datos inválidos', 'DATOS_INVALIDOS', 'JSON_INVALIDO');
const errorDemasiadas = respuestaError('Demasiados intentos', 'DEMASIADAS_PETICIONES');

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Disagro · Auth Service',
    version: '1.0.0',
    description: [
      'Servicio de autenticación de la plataforma de la Feria de Promociones.',
      '',
      '**Flujo:** registro → confirmación por correo → login → uso del access token → refresh / logout.',
      '',
      '- El **access token** (JWT RS256, 15 min) se envía en `Authorization: Bearer <token>`.',
      '- El **refresh token** (7 días) viaja en una cookie httpOnly y rota en cada uso; reutilizar uno ya rotado cierra todas las sesiones del usuario.',
      '- Todas las respuestas de error tienen el formato `{ error: { codigo, mensaje, detalles? } }`.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Registro', description: 'Alta de clientes y confirmación de correo' },
    { name: 'Sesión', description: 'Login, renovación y cierre de sesión' },
    { name: 'Perfil', description: 'Datos del usuario autenticado' },
    { name: 'Sistema', description: 'Monitoreo (health check para Docker y el balanceador de AWS)' },
  ],
  paths: {
    '/auth/registro': {
      post: {
        tags: ['Registro'],
        summary: 'Registrar un cliente',
        description:
          'Crea la cuenta con tipo `CLIENTE` y envía el correo de confirmación. El tipo nunca se toma del cuerpo de la petición.',
        requestBody: cuerpoJson('RegistroRequest', {
          nombre: 'María',
          apellidos: 'Gómez López',
          email: 'maria@ejemplo.com',
          password: 'secreta123',
        }),
        responses: {
          201: {
            description: 'Cuenta creada, pendiente de confirmar el correo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string' },
                    usuario: { $ref: '#/components/schemas/Usuario' },
                  },
                },
              },
            },
          },
          400: errorDatosInvalidos,
          409: respuestaError('El email ya está registrado', 'EMAIL_REGISTRADO'),
          429: errorDemasiadas,
        },
      },
    },
    '/auth/verificar': {
      post: {
        tags: ['Registro'],
        summary: 'Confirmar el correo',
        description:
          'Recibe el token del enlace enviado por correo (`/verificar?token=...` en el frontend). Cada token es de un solo uso.',
        requestBody: cuerpoJson('VerificarRequest', { token: 'R4XfYzaT...' }),
        responses: {
          200: respuestaMensaje('Correo confirmado'),
          400: respuestaError(
            'Token inválido, usado o expirado',
            'TOKEN_VERIFICACION_INVALIDO',
            'TOKEN_VERIFICACION_EXPIRADO',
            'DATOS_INVALIDOS',
          ),
        },
      },
    },
    '/auth/reenviar-verificacion': {
      post: {
        tags: ['Registro'],
        summary: 'Reenviar el correo de confirmación',
        description:
          'Invalida los enlaces anteriores y envía uno nuevo. Siempre responde 200 para no revelar si el email está registrado.',
        requestBody: cuerpoJson('ReenviarVerificacionRequest', { email: 'maria@ejemplo.com' }),
        responses: {
          200: respuestaMensaje('Solicitud procesada'),
          400: errorDatosInvalidos,
          429: errorDemasiadas,
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Sesión'],
        summary: 'Iniciar sesión',
        requestBody: cuerpoJson('LoginRequest', { email: 'maria@ejemplo.com', password: 'secreta123' }),
        responses: {
          200: respuestaSesion,
          400: errorDatosInvalidos,
          401: respuestaError('Email o contraseña incorrectos', 'CREDENCIALES_INVALIDAS'),
          403: respuestaError('Cuenta no habilitada para iniciar sesión', 'EMAIL_NO_VERIFICADO', 'USUARIO_INACTIVO'),
          429: errorDemasiadas,
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Sesión'],
        summary: 'Renovar el access token',
        description: 'Usa la cookie `refresh_token`, la revoca y entrega una nueva junto con un access token nuevo.',
        security: [{ refreshCookie: [] }],
        responses: {
          200: respuestaSesion,
          401: respuestaError('Sin sesión válida', 'SESION_INVALIDA', 'SESION_EXPIRADA'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Sesión'],
        summary: 'Cerrar sesión',
        description: 'Revoca el refresh token de la cookie y la elimina.',
        security: [{ refreshCookie: [] }],
        responses: { 204: { description: 'Sesión cerrada' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Perfil'],
        summary: 'Obtener el usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Datos del usuario',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { usuario: { $ref: '#/components/schemas/Usuario' } } },
              },
            },
          },
          401: respuestaError('Sin token o token inválido', 'NO_AUTENTICADO', 'TOKEN_INVALIDO'),
        },
      },
    },
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Disponibilidad del servicio',
        responses: {
          200: { description: 'Servicio y base de datos disponibles' },
          503: { description: 'La base de datos no responde' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refresh_token' },
    },
    schemas: {
      RegistroRequest: desdeZod(registroDto),
      LoginRequest: desdeZod(loginDto),
      VerificarRequest: desdeZod(verificarDto),
      ReenviarVerificacionRequest: desdeZod(reenviarVerificacionDto),
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'María' },
          apellidos: { type: 'string', example: 'Gómez López' },
          email: { type: 'string', format: 'email', example: 'maria@ejemplo.com' },
          tipo: { type: 'string', example: 'CLIENTE', description: 'Código del tipo de usuario' },
          emailVerificado: { type: 'boolean', example: true },
        },
      },
      Sesion: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', description: 'JWT RS256 con `sub`, `tipo` y `email`' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
      Mensaje: {
        type: 'object',
        properties: { mensaje: { type: 'string' } },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              codigo: { type: 'string', example: 'DATOS_INVALIDOS' },
              mensaje: { type: 'string', example: 'Los datos enviados no son válidos' },
              detalles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { campo: { type: 'string' }, mensaje: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
};
