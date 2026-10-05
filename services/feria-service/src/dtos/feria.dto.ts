import { z } from 'zod';

export const confirmacionDto = z.object({
  fechaHoraAsistencia: z.iso.datetime({
    offset: true,
    error: 'La fecha y hora debe tener formato ISO 8601, p. ej. 2026-11-16T10:30:00-06:00',
  }),
  itemIds: z
    .array(z.number().int().positive(), { error: 'Debe enviar una lista de ids de servicios o productos' })
    .min(1, 'Seleccione al menos un servicio o producto')
    .max(50, 'Puede seleccionar como máximo 50 elementos')
    .refine((ids) => new Set(ids).size === ids.length, 'La lista de servicios y productos tiene elementos repetidos'),
});

export const buscarItemsDto = z.object({
  buscar: z.string().trim().max(100).optional(),
  tipo: z.enum(['SERVICIO', 'PRODUCTO']).optional(),
});

export type ConfirmacionDto = z.infer<typeof confirmacionDto>;
export type BuscarItemsDto = z.infer<typeof buscarItemsDto>;
