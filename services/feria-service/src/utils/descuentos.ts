/**
 * Reglas de descuento de la Feria de Promociones.
 *
 * El frontend tiene una copia de estas reglas para mostrar el descuento en vivo.
 * El valor que cuenta es el de aquí: se recalcula con los precios de la base de
 * datos y se guarda. Si las reglas cambian, hay que actualizar ambas copias.
 *
 * Servicios:
 *   - 2 o más servicios                              → 3%
 *   - 2 o más servicios y la suma es MAYOR a Q.1,500 → 5%
 * Productos:
 *   - 3 o más productos → 3%
 *   - 5 o más productos → 5%
 */

export type TipoItem = 'SERVICIO' | 'PRODUCTO';

export interface ItemSeleccionado {
  tipo: TipoItem;
  /** Precio en quetzales, p. ej. 49.99 */
  precio: number;
}

export interface ResumenTipo {
  cantidad: number;
  /** Suma de precios en quetzales */
  subtotal: number;
  /** Porcentaje de descuento obtenido: 0, 3 o 5 */
  porcentaje: number;
  /** Monto descontado en quetzales */
  descuento: number;
  /** Subtotal menos descuento */
  total: number;
}

export interface ResultadoDescuentos {
  servicios: ResumenTipo;
  productos: ResumenTipo;
  /** Suma de ambos totales */
  total: number;
}

export const UMBRAL_MONTO_SERVICIOS = 1500;

// Se trabaja en centavos (enteros) para que sumas como 0.1 + 0.2 no generen
// errores de punto flotante justo en el límite de Q.1,500.
const aCentavos = (quetzales: number) => Math.round(quetzales * 100);
const aQuetzales = (centavos: number) => centavos / 100;

export function porcentajeServicios(cantidad: number, subtotal: number): number {
  if (cantidad < 2) return 0;
  return aCentavos(subtotal) > aCentavos(UMBRAL_MONTO_SERVICIOS) ? 5 : 3;
}

export function porcentajeProductos(cantidad: number): number {
  if (cantidad >= 5) return 5;
  if (cantidad >= 3) return 3;
  return 0;
}

/**
 * Aplica un porcentaje ya conocido a una lista de precios.
 * Se usa para mostrar una confirmación guardada con el porcentaje que se le otorgó
 * al cliente, aunque las reglas hayan cambiado después.
 */
export function aplicarPorcentaje(precios: number[], porcentaje: number): ResumenTipo {
  const subtotalCentavos = precios.reduce((suma, precio) => suma + aCentavos(precio), 0);
  const descuentoCentavos = Math.round((subtotalCentavos * porcentaje) / 100);

  return {
    cantidad: precios.length,
    subtotal: aQuetzales(subtotalCentavos),
    porcentaje,
    descuento: aQuetzales(descuentoCentavos),
    total: aQuetzales(subtotalCentavos - descuentoCentavos),
  };
}

function resumir(items: ItemSeleccionado[], calcularPorcentaje: (cantidad: number, subtotal: number) => number): ResumenTipo {
  const precios = items.map((item) => item.precio);
  const subtotal = aQuetzales(precios.reduce((suma, precio) => suma + aCentavos(precio), 0));
  return aplicarPorcentaje(precios, calcularPorcentaje(items.length, subtotal));
}

export function sumarTotales(servicios: ResumenTipo, productos: ResumenTipo): number {
  return aQuetzales(aCentavos(servicios.total) + aCentavos(productos.total));
}

export function calcularDescuentos(items: ItemSeleccionado[]): ResultadoDescuentos {
  const servicios = resumir(
    items.filter((item) => item.tipo === 'SERVICIO'),
    porcentajeServicios,
  );
  const productos = resumir(
    items.filter((item) => item.tipo === 'PRODUCTO'),
    (cantidad) => porcentajeProductos(cantidad),
  );

  return { servicios, productos, total: sumarTotales(servicios, productos) };
}
