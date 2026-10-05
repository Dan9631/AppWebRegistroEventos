import { ApiError, request } from './client';
import { requestAutenticado } from './auth.api';
import { ResultadoDescuentos, TipoItem } from '../utils/descuentos';

export interface Evento {
  id: number;
  nombre: string;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  telefonoAtencion: string | null;
}

export interface Item {
  id: number;
  tipo: TipoItem;
  nombre: string;
  descripcion: string | null;
  precio: number;
}

export interface Confirmacion {
  id: number;
  evento: Evento;
  fechaHoraAsistencia: string;
  creadoEn: string;
  items: Item[];
  resumen: ResultadoDescuentos;
}

export const feriaApi = {
  async evento(): Promise<Evento> {
    return (await request<{ evento: Evento }>('/feria/evento')).evento;
  },

  async items(): Promise<Item[]> {
    return (await request<{ items: Item[] }>('/feria/items')).items;
  },

  /** Devuelve null si el cliente aún no confirma. */
  async miConfirmacion(): Promise<Confirmacion | null> {
    try {
      return (await requestAutenticado<{ confirmacion: Confirmacion }>('/feria/confirmaciones/mia')).confirmacion;
    } catch (error) {
      if (error instanceof ApiError && error.codigo === 'SIN_CONFIRMACION') return null;
      throw error;
    }
  },

  async confirmar(datos: { fechaHoraAsistencia: string; itemIds: number[] }): Promise<Confirmacion> {
    return (
      await requestAutenticado<{ confirmacion: Confirmacion }>('/feria/confirmaciones', { method: 'POST', body: datos })
    ).confirmacion;
  },
};
