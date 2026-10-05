import { useEffect, useMemo, useRef, useState } from 'react';
import { Item } from '../../api/feria.api';
import { ResultadoDescuentos, TipoItem } from '../../utils/descuentos';
import { normalizar, quetzales } from '../../utils/formato';

type Filtro = 'TODOS' | TipoItem;

const FILTROS: { valor: Filtro; etiqueta: string; placeholder: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todos', placeholder: 'Buscar Servicios y Productos' },
  { valor: 'SERVICIO', etiqueta: 'Servicios', placeholder: 'Buscar servicios' },
  { valor: 'PRODUCTO', etiqueta: 'Productos', placeholder: 'Buscar productos' },
];

const NOMBRES: Record<TipoItem, { singular: string; plural: string }> = {
  SERVICIO: { singular: 'servicio', plural: 'servicios' },
  PRODUCTO: { singular: 'producto', plural: 'productos' },
};

interface Props {
  items: Item[];
  seleccionados: Set<number>;
  onCambiar: (id: number) => void;
  descuentos: ResultadoDescuentos;
  error?: string;
}

/** Panel del paso 2 del diseño: buscador, filtro por tipo, lista con casillas y descuentos obtenidos. */
export function SelectorItems({ items, seleccionados, onCambiar, descuentos, error }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const lista = useRef<HTMLDivElement>(null);

  // La búsqueda se aplica primero; el filtro decide qué parte de las coincidencias se muestra.
  // Así los contadores de cada filtro indican dónde hay resultados antes de cambiar.
  const coincidencias = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    return termino ? items.filter((item) => normalizar(item.nombre).includes(termino)) : items;
  }, [items, busqueda]);

  const conteo: Record<Filtro, number> = {
    TODOS: coincidencias.length,
    SERVICIO: coincidencias.filter((item) => item.tipo === 'SERVICIO').length,
    PRODUCTO: coincidencias.filter((item) => item.tipo === 'PRODUCTO').length,
  };

  const visibles = filtro === 'TODOS' ? coincidencias : coincidencias.filter((item) => item.tipo === filtro);
  const servicios = visibles.filter((item) => item.tipo === 'SERVICIO');
  const productos = visibles.filter((item) => item.tipo === 'PRODUCTO');

  // Al cambiar de filtro o de búsqueda, la lista vuelve al inicio.
  useEffect(() => {
    lista.current?.scrollTo({ top: 0 });
  }, [filtro, busqueda]);

  const placeholder = FILTROS.find((f) => f.valor === filtro)!.placeholder;

  return (
    <div className={`selector${error ? ' selector--error' : ''}`}>
      <div className="selector__busqueda">
        <label className="buscador">
          <span className="sr-only">{placeholder}</span>
          <input
            type="search"
            placeholder={placeholder}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L21 21" />
          </svg>
        </label>

        <div className="filtros" role="group" aria-label="Mostrar">
          {FILTROS.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              className={`filtros__opcion${filtro === opcion.valor ? ' filtros__opcion--activa' : ''}`}
              aria-pressed={filtro === opcion.valor}
              onClick={() => setFiltro(opcion.valor)}
            >
              {opcion.etiqueta}
              <span className="filtros__conteo">{conteo[opcion.valor]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="selector__cuerpo">
        <p className="selector__titulo">
          Servicios y/o Productos seleccionados: <strong>{seleccionados.size}</strong>
        </p>

        <div className="selector__lista" ref={lista} aria-live="polite">
          {visibles.length === 0 ? (
            <SinResultados
              busqueda={busqueda.trim()}
              filtro={filtro}
              conteo={conteo}
              onFiltro={setFiltro}
              onLimpiar={() => setBusqueda('')}
            />
          ) : (
            <>
              <GrupoItems titulo="Servicios" items={servicios} seleccionados={seleccionados} onCambiar={onCambiar} />
              <GrupoItems titulo="Productos" items={productos} seleccionados={seleccionados} onCambiar={onCambiar} />
            </>
          )}
        </div>
      </div>

      <div className="selector__descuentos">
        <Descuento titulo="Descuento obtenido en Servicios" porcentaje={descuentos.servicios.porcentaje} />
        <Descuento titulo="Descuento obtenido en Productos" porcentaje={descuentos.productos.porcentaje} />
      </div>

      {error && (
        <p className="campo__error selector__mensaje-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Explica por qué no hay resultados y ofrece cómo salir: ver el otro tipo o limpiar la búsqueda. */
function SinResultados({
  busqueda,
  filtro,
  conteo,
  onFiltro,
  onLimpiar,
}: {
  busqueda: string;
  filtro: Filtro;
  conteo: Record<Filtro, number>;
  onFiltro: (filtro: Filtro) => void;
  onLimpiar: () => void;
}) {
  const que = filtro === 'TODOS' ? 'servicios ni productos' : NOMBRES[filtro].plural;
  const otro: TipoItem | null = filtro === 'SERVICIO' ? 'PRODUCTO' : filtro === 'PRODUCTO' ? 'SERVICIO' : null;
  const enOtro = otro ? conteo[otro] : 0;

  return (
    <div className="selector__vacio">
      <p>{busqueda ? `No hay ${que} que coincidan con “${busqueda}”.` : `No hay ${que} disponibles.`}</p>
      <div className="selector__vacio-acciones">
        {otro && enOtro > 0 && (
          <button type="button" className="boton boton--texto" onClick={() => onFiltro(otro)}>
            Ver {enOtro} {enOtro === 1 ? NOMBRES[otro].singular : NOMBRES[otro].plural} que{' '}
            {enOtro === 1 ? 'coincide' : 'coinciden'}
          </button>
        )}
        {busqueda && (
          <button type="button" className="boton boton--texto" onClick={onLimpiar}>
            Limpiar búsqueda
          </button>
        )}
      </div>
    </div>
  );
}

function GrupoItems({
  titulo,
  items,
  seleccionados,
  onCambiar,
}: {
  titulo: string;
  items: Item[];
  seleccionados: Set<number>;
  onCambiar: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <fieldset className="grupo-items">
      <legend className="grupo-items__titulo">{titulo}</legend>
      {items.map((item) => (
        <label key={item.id} className="item-opcion">
          <input type="checkbox" checked={seleccionados.has(item.id)} onChange={() => onCambiar(item.id)} />
          <span className="item-opcion__check" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <span className="item-opcion__texto">
            <span className="item-opcion__nombre">{item.nombre}</span>
            {item.descripcion && <span className="item-opcion__descripcion">{item.descripcion}</span>}
          </span>
          <span className="item-opcion__precio">{quetzales(item.precio)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function Descuento({ titulo, porcentaje }: { titulo: string; porcentaje: number }) {
  return (
    <div className="descuento" aria-live="polite">
      <span className="descuento__titulo">{titulo}</span>
      <span className={`descuento__valor${porcentaje > 0 ? ' descuento__valor--activo' : ''}`}>{porcentaje}%</span>
    </div>
  );
}
