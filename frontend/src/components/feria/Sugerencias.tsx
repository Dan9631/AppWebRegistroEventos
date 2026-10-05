import { ResultadoDescuentos, UMBRAL_MONTO_SERVICIOS } from '../../utils/descuentos';
import { quetzales } from '../../utils/formato';

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

/** Indica al cliente qué le falta para alcanzar el siguiente descuento. */
export function sugerenciasDescuento({ servicios, productos }: ResultadoDescuentos): string[] {
  const sugerencias: string[] = [];

  if (servicios.cantidad < 2) {
    sugerencias.push(`Agrega ${plural(2 - servicios.cantidad, 'servicio', 'servicios')} para obtener 3% en servicios.`);
  } else if (servicios.porcentaje < 5) {
    const falta = UMBRAL_MONTO_SERVICIOS - servicios.subtotal;
    sugerencias.push(`Supera ${quetzales(UMBRAL_MONTO_SERVICIOS)} en servicios (te faltan ${quetzales(Math.max(falta, 0.01))}) para obtener 5%.`);
  }

  if (productos.cantidad < 3) {
    sugerencias.push(`Agrega ${plural(3 - productos.cantidad, 'producto', 'productos')} para obtener 3% en productos.`);
  } else if (productos.cantidad < 5) {
    sugerencias.push(`Agrega ${plural(5 - productos.cantidad, 'producto', 'productos')} para obtener 5% en productos.`);
  }

  return sugerencias;
}

export function Sugerencias({ descuentos }: { descuentos: ResultadoDescuentos }) {
  const sugerencias = sugerenciasDescuento(descuentos);
  if (sugerencias.length === 0) {
    return <p className="sugerencias sugerencias--completo">¡Obtuviste el máximo descuento en servicios y productos!</p>;
  }
  return (
    <ul className="sugerencias">
      {sugerencias.map((texto) => (
        <li key={texto}>{texto}</li>
      ))}
    </ul>
  );
}
