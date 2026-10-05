import { Confirmacion, Item } from '../../api/feria.api';
import { ResumenTipo } from '../../utils/descuentos';
import { fechaLarga, hora, quetzales } from '../../utils/formato';

/** Resumen de la confirmación: lo que el cliente eligió y el descuento que se le otorgó. */
export function Portafolio({ confirmacion, recienConfirmado }: { confirmacion: Confirmacion; recienConfirmado: boolean }) {
  const { resumen } = confirmacion;
  const ahorro = resumen.servicios.descuento + resumen.productos.descuento;

  return (
    <section className="tarjeta portafolio">
      <header className="portafolio__encabezado">
        <div className="icono-estado icono-estado--exito" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <div>
          <h2 className="tarjeta__titulo">{recienConfirmado ? '¡Asistencia confirmada!' : 'Tu asistencia está confirmada'}</h2>
          <p className="tarjeta__subtitulo">
            Te esperamos el <strong>{fechaLarga(confirmacion.fechaHoraAsistencia)}</strong> a las{' '}
            <strong>{hora(confirmacion.fechaHoraAsistencia)}</strong>.
          </p>
        </div>
      </header>

      <h3 className="portafolio__titulo">Tu portafolio de promociones</h3>

      <div className="portafolio__grupos">
        <GrupoPortafolio
          titulo="Servicios"
          items={confirmacion.items.filter((i) => i.tipo === 'SERVICIO')}
          resumen={resumen.servicios}
        />
        <GrupoPortafolio
          titulo="Productos"
          items={confirmacion.items.filter((i) => i.tipo === 'PRODUCTO')}
          resumen={resumen.productos}
        />
      </div>

      <div className="portafolio__total">
        <div>
          <span>Total con descuento</span>
          {ahorro > 0 && <span className="portafolio__ahorro">Ahorras {quetzales(ahorro)}</span>}
        </div>
        <strong>{quetzales(resumen.total)}</strong>
      </div>

      <div className="portafolio__acciones">
        <button type="button" className="boton boton--secundario" onClick={() => window.print()}>
          Imprimir portafolio
        </button>
      </div>
    </section>
  );
}

function GrupoPortafolio({ titulo, items, resumen }: { titulo: string; items: Item[]; resumen: ResumenTipo }) {
  if (items.length === 0) return null;

  return (
    <div className="portafolio__grupo">
      <h4>{titulo}</h4>
      <table className="tabla-portafolio">
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.nombre}</td>
              <td className="numero">{quetzales(item.precio)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Subtotal</td>
            <td className="numero">{quetzales(resumen.subtotal)}</td>
          </tr>
          <tr className={resumen.porcentaje > 0 ? 'tabla-portafolio__descuento' : ''}>
            <td>Descuento ({resumen.porcentaje}%)</td>
            <td className="numero">− {quetzales(resumen.descuento)}</td>
          </tr>
          <tr className="tabla-portafolio__total">
            <td>Total {titulo.toLowerCase()}</td>
            <td className="numero">{quetzales(resumen.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
