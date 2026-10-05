import { z } from 'zod';
import { confirmacionDto } from '../dtos/feria.dto';

// El esquema de entrada sale del mismo DTO de Zod que valida la petición.
function desdeZod(esquema: z.ZodType) {
  const { $schema: _omitido, ...jsonSchema } = z.toJSONSchema(esquema, { io: 'input' });
  return jsonSchema;
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

const json = (ref: string, envoltura: string) => ({
  'application/json': {
    schema: { type: 'object', properties: { [envoltura]: { $ref: `#/components/schemas/${ref}` } } },
  },
});

const errorSesion = respuestaError('Sin token o token inválido', 'NO_AUTENTICADO', 'TOKEN_INVALIDO');
const errorTipo = respuestaError('El tipo de usuario no tiene acceso', 'SIN_PERMISO');
const errorSinEvento = respuestaError('No hay un evento activo', 'SIN_EVENTO_ACTIVO');

const resumenTipo = {
  type: 'object',
  properties: {
    cantidad: { type: 'integer', example: 2 },
    subtotal: { type: 'number', example: 1500.3 },
    porcentaje: { type: 'number', example: 5, description: '0, 3 o 5' },
    descuento: { type: 'number', example: 75.02 },
    total: { type: 'number', example: 1425.28 },
  },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Disagro · Feria Service',
    version: '1.0.0',
    description: [
      'Evento activo, catálogo de servicios y productos, y confirmaciones de asistencia.',
      '',
      '**Autenticación:** las rutas de confirmación requieren el access token emitido por `auth-service`',
      '(`Authorization: Bearer <token>`). Este servicio lo valida con la llave pública, sin consultar a `auth-service`.',
      '',
      '**Descuentos:** se calculan con el paquete compartido `@disagro/descuentos`, el mismo que usa el frontend:',
      '- Servicios: 2 o más → 3%; 2 o más y suma mayor a Q.1,500 → 5%.',
      '- Productos: 3 o más → 3%; 5 o más → 5%.',
      '',
      'El precio y el porcentaje se guardan al confirmar; el portafolio siempre muestra lo que el cliente vio.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Evento', description: 'Información del evento activo' },
    { name: 'Catálogo', description: 'Servicios y productos disponibles' },
    { name: 'Confirmación', description: 'Confirmación de asistencia del cliente' },
    { name: 'Sistema', description: 'Monitoreo' },
  ],
  paths: {
    '/feria/evento': {
      get: {
        tags: ['Evento'],
        summary: 'Obtener el evento activo',
        description: 'Datos para el encabezado y límites de fecha del formulario.',
        responses: {
          200: { description: 'Evento activo', content: json('Evento', 'evento') },
          404: errorSinEvento,
        },
      },
    },
    '/feria/items': {
      get: {
        tags: ['Catálogo'],
        summary: 'Listar servicios y productos',
        parameters: [
          { name: 'buscar', in: 'query', schema: { type: 'string' }, description: 'Texto contenido en el nombre' },
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['SERVICIO', 'PRODUCTO'] } },
        ],
        responses: {
          200: {
            description: 'Ítems activos, servicios primero',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Item' } } },
                },
              },
            },
          },
          400: respuestaError('Filtros inválidos', 'DATOS_INVALIDOS'),
        },
      },
    },
    '/feria/confirmaciones/mia': {
      get: {
        tags: ['Confirmación'],
        summary: 'Obtener mi confirmación (portafolio)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Confirmación del cliente en el evento activo', content: json('Confirmacion', 'confirmacion') },
          401: errorSesion,
          403: errorTipo,
          404: respuestaError('El cliente aún no confirma, o no hay evento activo', 'SIN_CONFIRMACION', 'SIN_EVENTO_ACTIVO'),
        },
      },
    },
    '/feria/confirmaciones': {
      post: {
        tags: ['Confirmación'],
        summary: 'Confirmar asistencia',
        description:
          'Registra la fecha y hora de visita y los servicios/productos de interés. Los precios se toman de la base de datos y el descuento se calcula en el servidor.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConfirmacionRequest' },
              example: { fechaHoraAsistencia: '2026-11-17T10:30:00-06:00', itemIds: [1, 2, 8, 9, 10] },
            },
          },
        },
        responses: {
          201: { description: 'Asistencia confirmada', content: json('Confirmacion', 'confirmacion') },
          400: respuestaError(
            'Datos inválidos',
            'DATOS_INVALIDOS',
            'FECHA_FUERA_DE_RANGO',
            'FUERA_DE_HORARIO',
            'FECHA_PASADA',
            'ITEM_NO_DISPONIBLE',
          ),
          401: errorSesion,
          403: errorTipo,
          404: errorSinEvento,
          409: respuestaError('El cliente ya confirmó su asistencia', 'YA_CONFIRMADO'),
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
    },
    schemas: {
      ConfirmacionRequest: desdeZod(confirmacionDto),
      Evento: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Feria de Promociones' },
          anio: { type: 'integer', example: 2026 },
          fechaInicio: { type: 'string', format: 'date-time', example: '2026-11-16T14:00:00.000Z' },
          fechaFin: { type: 'string', format: 'date-time', example: '2026-11-20T23:00:00.000Z' },
          telefonoAtencion: { type: ['string', 'null'], example: '2223-2425' },
        },
      },
      Item: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          tipo: { type: 'string', enum: ['SERVICIO', 'PRODUCTO'] },
          nombre: { type: 'string', example: 'Análisis de suelo' },
          descripcion: { type: ['string', 'null'] },
          precio: { type: 'number', example: 850 },
        },
      },
      Confirmacion: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          evento: { $ref: '#/components/schemas/Evento' },
          fechaHoraAsistencia: { type: 'string', format: 'date-time' },
          creadoEn: { type: 'string', format: 'date-time' },
          items: {
            type: 'array',
            description: 'Con el precio al momento de confirmar',
            items: { $ref: '#/components/schemas/Item' },
          },
          resumen: {
            type: 'object',
            properties: {
              servicios: resumenTipo,
              productos: resumenTipo,
              total: { type: 'number' },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              codigo: { type: 'string' },
              mensaje: { type: 'string' },
              detalles: {
                type: 'array',
                items: { type: 'object', properties: { campo: { type: 'string' }, mensaje: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
  },
};
