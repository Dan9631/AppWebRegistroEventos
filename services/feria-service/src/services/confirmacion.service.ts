import { aplicarPorcentaje, calcularDescuentos, ResultadoDescuentos, sumarTotales } from '../utils/descuentos';
import { Prisma } from '@prisma/client';
import { ConfirmacionDto } from '../dtos/feria.dto';
import { ConfirmacionConDetalle, confirmacionModel } from '../models/confirmacion.model';
import { itemModel } from '../models/item.model';
import { AppError } from '../utils/errors';
import { aEventoPublico, EventoPublico, eventoService } from './evento.service';
import { ItemPublico } from './catalogo.service';

const ZONA_HORARIA = 'America/Guatemala';

/** Hora del día en Guatemala con formato HH:mm, p. ej. "08:00". */
function horaLocal(fecha: Date): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(fecha);
}

/**
 * El evento abre todos los días a la hora de fecha_inicio y cierra a la hora de fecha_fin.
 * Las horas en formato HH:mm se pueden comparar como texto.
 */
function dentroDelHorario(fecha: Date, inicio: Date, fin: Date): boolean {
  const hora = horaLocal(fecha);
  return hora >= horaLocal(inicio) && hora <= horaLocal(fin);
}

/** Portafolio del cliente: lo que confirmó y el descuento que se le otorgó. */
export interface ConfirmacionPublica {
  id: number;
  evento: EventoPublico;
  fechaHoraAsistencia: string;
  creadoEn: string;
  items: ItemPublico[];
  resumen: ResultadoDescuentos;
}

function aConfirmacionPublica(confirmacion: ConfirmacionConDetalle): ConfirmacionPublica {
  // Se usan el precio y el porcentaje guardados, no los actuales:
  // el portafolio debe mostrar lo que el cliente vio al confirmar.
  const items: ItemPublico[] = confirmacion.items.map(({ item, precioUnitario }) => ({
    id: item.id,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion,
    precio: precioUnitario.toNumber(),
  }));

  const preciosDe = (tipo: ItemPublico['tipo']) => items.filter((i) => i.tipo === tipo).map((i) => i.precio);
  const servicios = aplicarPorcentaje(preciosDe('SERVICIO'), confirmacion.descuentoServicios.toNumber());
  const productos = aplicarPorcentaje(preciosDe('PRODUCTO'), confirmacion.descuentoProductos.toNumber());

  return {
    id: confirmacion.id,
    evento: aEventoPublico(confirmacion.evento),
    fechaHoraAsistencia: confirmacion.fechaHoraAsistencia.toISOString(),
    creadoEn: confirmacion.creadoEn.toISOString(),
    items,
    resumen: { servicios, productos, total: sumarTotales(servicios, productos) },
  };
}

export const confirmacionService = {
  async obtenerMia(usuarioId: number): Promise<ConfirmacionPublica> {
    const evento = await eventoService.obtenerActivo();
    const confirmacion = await confirmacionModel.buscarDeUsuario(evento.id, usuarioId);
    if (!confirmacion) {
      throw new AppError(404, 'SIN_CONFIRMACION', 'Aún no ha confirmado su asistencia');
    }
    return aConfirmacionPublica(confirmacion);
  },

  async confirmar(usuarioId: number, datos: ConfirmacionDto): Promise<ConfirmacionPublica> {
    const evento = await eventoService.obtenerActivo();

    const existente = await confirmacionModel.buscarDeUsuario(evento.id, usuarioId);
    if (existente) {
      throw new AppError(409, 'YA_CONFIRMADO', 'Ya confirmó su asistencia a este evento');
    }

    const fechaHora = new Date(datos.fechaHoraAsistencia);
    if (fechaHora < evento.fechaInicio || fechaHora > evento.fechaFin) {
      throw new AppError(400, 'FECHA_FUERA_DE_RANGO', 'La fecha y hora debe estar dentro de los días del evento', [
        { campo: 'fechaHoraAsistencia', mensaje: 'Seleccione una fecha y hora dentro de los días del evento' },
      ]);
    }
    if (!dentroDelHorario(fechaHora, evento.fechaInicio, evento.fechaFin)) {
      const [apertura, cierre] = [horaLocal(evento.fechaInicio), horaLocal(evento.fechaFin)];
      throw new AppError(400, 'FUERA_DE_HORARIO', `El horario de atención es de ${apertura} a ${cierre}`, [
        { campo: 'fechaHoraAsistencia', mensaje: `Seleccione una hora entre ${apertura} y ${cierre}` },
      ]);
    }
    if (fechaHora < new Date()) {
      throw new AppError(400, 'FECHA_PASADA', 'La fecha y hora seleccionada ya pasó', [
        { campo: 'fechaHoraAsistencia', mensaje: 'Seleccione una fecha y hora futura' },
      ]);
    }

    // Los precios salen de la base de datos, nunca del cliente.
    const items = await itemModel.buscarActivosPorIds(datos.itemIds);
    if (items.length !== datos.itemIds.length) {
      const encontrados = new Set(items.map((i) => i.id));
      const faltantes = datos.itemIds.filter((id) => !encontrados.has(id));
      throw new AppError(400, 'ITEM_NO_DISPONIBLE', 'Algunos servicios o productos ya no están disponibles', [
        { campo: 'itemIds', mensaje: `No disponibles: ${faltantes.join(', ')}` },
      ]);
    }

    // El descuento se calcula aquí con las mismas reglas que muestra el frontend.
    const descuentos = calcularDescuentos(items.map((i) => ({ tipo: i.tipo, precio: i.precio.toNumber() })));

    try {
      const confirmacion = await confirmacionModel.crear({
        eventoId: evento.id,
        usuarioId,
        fechaHoraAsistencia: fechaHora,
        descuentoServicios: descuentos.servicios.porcentaje,
        descuentoProductos: descuentos.productos.porcentaje,
        items: items.map((i) => ({ itemId: i.id, precioUnitario: i.precio })),
      });
      return aConfirmacionPublica(confirmacion);
    } catch (error) {
      // Dos confirmaciones simultáneas del mismo cliente: el índice único decide.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'YA_CONFIRMADO', 'Ya confirmó su asistencia a este evento');
      }
      throw error;
    }
  },
};
