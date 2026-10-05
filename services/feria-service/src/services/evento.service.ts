import { Evento } from '@prisma/client';
import { eventoModel } from '../models/evento.model';
import { AppError } from '../utils/errors';

export interface EventoPublico {
  id: number;
  nombre: string;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  telefonoAtencion: string | null;
}

export function aEventoPublico(evento: Evento): EventoPublico {
  return {
    id: evento.id,
    nombre: evento.nombre,
    anio: evento.anio,
    fechaInicio: evento.fechaInicio.toISOString(),
    fechaFin: evento.fechaFin.toISOString(),
    telefonoAtencion: evento.telefonoAtencion,
  };
}

export const eventoService = {
  async obtenerActivo(): Promise<Evento> {
    const evento = await eventoModel.buscarActivo();
    if (!evento) {
      throw new AppError(404, 'SIN_EVENTO_ACTIVO', 'No hay un evento activo en este momento');
    }
    return evento;
  },
};
