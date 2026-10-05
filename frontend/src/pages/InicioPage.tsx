import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { Confirmacion, Evento, feriaApi, Item } from '../api/feria.api';
import { useAuth } from '../auth/AuthContext';
import { Alerta } from '../components/Alerta';
import { Boton } from '../components/Boton';
import { Campo, CampoSelect } from '../components/Campo';
import { Cargando } from '../components/Cargando';
import { Portafolio } from '../components/feria/Portafolio';
import { SelectorItems } from '../components/feria/SelectorItems';
import { Sugerencias } from '../components/feria/Sugerencias';
import { useEvento } from '../hooks/useEvento';
import { calcularDescuentos } from '../utils/descuentos';
import { aFechaHoraIso, diasDelEvento, horariosDelEvento, quetzales } from '../utils/formato';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; items: Item[]; confirmacion: Confirmacion | null };

/** Página principal con sesión: formulario de confirmación o, si ya confirmó, su portafolio. */
export function InicioPage() {
  const { evento, cargando: cargandoEvento } = useEvento();
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [recienConfirmado, setRecienConfirmado] = useState(false);

  const cargar = useCallback(async () => {
    setCarga({ estado: 'cargando' });
    try {
      const [items, confirmacion] = await Promise.all([feriaApi.items(), feriaApi.miConfirmacion()]);
      setCarga({ estado: 'listo', items, confirmacion });
    } catch (error) {
      setCarga({
        estado: 'error',
        mensaje: error instanceof ApiError ? error.message : 'No se pudo cargar la información de la feria',
      });
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargandoEvento || carga.estado === 'cargando') return <Cargando texto="Cargando la feria..." />;

  if (!evento) {
    return (
      <div className="centrado">
        <Alerta tipo="info" titulo="No hay un evento activo">
          Por ahora no hay una feria abierta para confirmar asistencia. Vuelve pronto.
        </Alerta>
      </div>
    );
  }

  if (carga.estado === 'error') {
    return (
      <div className="centrado">
        <Alerta tipo="error" accion={<Boton variante="texto" onClick={cargar}>Reintentar</Boton>}>
          {carga.mensaje}
        </Alerta>
      </div>
    );
  }

  if (carga.confirmacion) {
    return (
      <div className="inicio inicio--estrecho">
        <Portafolio confirmacion={carga.confirmacion} recienConfirmado={recienConfirmado} />
      </div>
    );
  }

  return (
    <FormularioConfirmacion
      evento={evento}
      items={carga.items}
      onConfirmado={(confirmacion) => {
        setRecienConfirmado(true);
        setCarga({ estado: 'listo', items: carga.items, confirmacion });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      onRecargar={cargar}
    />
  );
}

function FormularioConfirmacion({
  evento,
  items,
  onConfirmado,
  onRecargar,
}: {
  evento: Evento;
  items: Item[];
  onConfirmado: (confirmacion: Confirmacion) => void;
  onRecargar: () => void;
}) {
  const { usuario } = useAuth();
  const [dia, setDia] = useState('');
  const [horario, setHorario] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [errores, setErrores] = useState<{ dia?: string; horario?: string; items?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const dias = useMemo(() => diasDelEvento(evento.fechaInicio, evento.fechaFin), [evento]);
  // Solo horarios futuros: si el evento ya empezó, no se ofrecen horas pasadas de hoy.
  const horarios = useMemo(() => {
    if (!dia) return [];
    const ahora = Date.now();
    return horariosDelEvento(evento.fechaInicio, evento.fechaFin)
      .filter((h) => new Date(aFechaHoraIso(dia, h)).getTime() > ahora)
      .map((h) => ({ valor: h, etiqueta: h }));
  }, [dia, evento]);

  const descuentos = useMemo(
    () => calcularDescuentos(items.filter((item) => seleccionados.has(item.id))),
    [items, seleccionados],
  );
  const ahorro = descuentos.servicios.descuento + descuentos.productos.descuento;

  function alternarItem(id: number) {
    setSeleccionados((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) nuevos.delete(id);
      else nuevos.add(id);
      return nuevos;
    });
    setErrores((e) => ({ ...e, items: undefined }));
  }

  async function confirmar() {
    setErrorGeneral(null);
    const nuevosErrores = {
      dia: dia ? undefined : 'Seleccione el día en que asistirá',
      horario: horario ? undefined : 'Seleccione la hora en que asistirá',
      items: seleccionados.size > 0 ? undefined : 'Seleccione al menos un servicio o producto de su interés',
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setEnviando(true);
    try {
      onConfirmado(
        await feriaApi.confirmar({ fechaHoraAsistencia: aFechaHoraIso(dia, horario), itemIds: [...seleccionados] }),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setErrorGeneral('No se pudo confirmar la asistencia');
      } else if (error.codigo === 'YA_CONFIRMADO') {
        onRecargar(); // ya existe: se muestra su portafolio
      } else if (['FECHA_FUERA_DE_RANGO', 'FUERA_DE_HORARIO', 'FECHA_PASADA'].includes(error.codigo)) {
        setErrores({ horario: error.detalles[0]?.mensaje ?? error.message });
      } else if (error.codigo === 'ITEM_NO_DISPONIBLE') {
        setErrorGeneral(`${error.message}. Recargue la página para ver el catálogo actualizado.`);
      } else {
        setErrorGeneral(error.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (!usuario) return null;

  return (
    <div className="feria">
      <p className="feria__intro">
        Hola <strong>{usuario.nombre}</strong>, confirma tu asistencia y elige lo que te interesa para recibir tu
        portafolio de promociones personalizado.
      </p>

      {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}

      <div className="feria__grid">
        <section aria-labelledby="paso-1">
          <div className="paso-encabezado">
            <span className="paso-numero">1</span>
            <h2 id="paso-1">Ingrese su información</h2>
          </div>
          <div className="tarjeta formulario">
            <Campo etiqueta="Nombre:" value={usuario.nombre} readOnly />
            <Campo etiqueta="Apellidos:" value={usuario.apellidos} readOnly />
            <Campo etiqueta="Email:" value={usuario.email} readOnly />
            <CampoSelect
              etiqueta="Fecha:"
              placeholder="Seleccione el día en que asistirá"
              opciones={dias}
              value={dia}
              onChange={(e) => {
                setDia(e.target.value);
                setHorario('');
                setErrores((x) => ({ ...x, dia: undefined }));
              }}
              error={errores.dia}
            />
            <CampoSelect
              etiqueta="Hora:"
              placeholder={dia ? 'Seleccione la hora' : 'Primero seleccione el día'}
              opciones={horarios}
              value={horario}
              disabled={!dia}
              onChange={(e) => {
                setHorario(e.target.value);
                setErrores((x) => ({ ...x, horario: undefined }));
              }}
              error={errores.horario}
              ayuda={dia && horarios.length === 0 ? 'No quedan horarios disponibles este día' : undefined}
            />
          </div>
        </section>

        <section aria-labelledby="paso-2">
          <div className="paso-encabezado">
            <span className="paso-numero">2</span>
            <h2 id="paso-2">Seleccione Servicios y Productos de su interés</h2>
          </div>
          <SelectorItems
            items={items}
            seleccionados={seleccionados}
            onCambiar={alternarItem}
            descuentos={descuentos}
            error={errores.items}
          />
          <Sugerencias descuentos={descuentos} />
        </section>
      </div>

      <div className="feria__acciones">
        {seleccionados.size > 0 && (
          <p className="feria__estimado">
            Total estimado: <strong>{quetzales(descuentos.total)}</strong>
            {ahorro > 0 && <span className="portafolio__ahorro"> · Ahorras {quetzales(ahorro)}</span>}
          </p>
        )}
        <Boton onClick={confirmar} cargando={enviando} textoCargando="Confirmando..." conFlecha>
          Confirmar asistencia
        </Boton>
      </div>
    </div>
  );
}
