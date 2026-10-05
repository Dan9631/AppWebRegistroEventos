// El evento es en Guatemala: fechas y horas se muestran siempre en su zona horaria,
// sin importar la configuración del navegador. Guatemala no usa horario de verano,
// así que su desfase es siempre -06:00.
const ZONA_HORARIA = 'America/Guatemala';
const DESFASE_GUATEMALA = '-06:00';

/** Q.1,500.00 — el formato del diseño propuesto */
export function quetzales(monto: number): string {
  return `Q.${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const formatoDia = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA_HORARIA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const formatoFechaLarga = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA_HORARIA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const formatoHora = new Intl.DateTimeFormat('es-GT', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** YYYY-MM-DD en hora de Guatemala */
const formatoIso = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA });

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export function hora(fechaIso: string): string {
  return formatoHora.format(new Date(fechaIso));
}

/** "martes, 17 de noviembre de 2026" (en minúscula: se usa a mitad de frase) */
export function fechaLarga(fechaIso: string): string {
  return formatoFechaLarga.format(new Date(fechaIso));
}

export interface Opcion {
  valor: string;
  etiqueta: string;
}

/** Días del evento, p. ej. { valor: '2026-11-16', etiqueta: 'Lunes, 16 de noviembre' } */
export function diasDelEvento(inicioIso: string, finIso: string): Opcion[] {
  const dias: Opcion[] = [];
  const ultimo = formatoIso.format(new Date(finIso));
  let actual = formatoIso.format(new Date(inicioIso));

  while (actual <= ultimo) {
    // Mediodía para que el día no cambie al convertir de zona horaria
    const mediodia = new Date(`${actual}T12:00:00${DESFASE_GUATEMALA}`);
    dias.push({ valor: actual, etiqueta: capitalizar(formatoDia.format(mediodia)) });
    actual = formatoIso.format(new Date(mediodia.getTime() + 24 * 60 * 60 * 1000));
  }
  return dias;
}

/** Horarios cada 30 minutos desde la apertura hasta media hora antes del cierre. */
export function horariosDelEvento(inicioIso: string, finIso: string): string[] {
  const aMinutos = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const apertura = aMinutos(hora(inicioIso));
  const cierre = aMinutos(hora(finIso));

  const horarios: string[] = [];
  for (let minutos = apertura; minutos < cierre; minutos += 30) {
    horarios.push(`${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`);
  }
  return horarios;
}

/** Une día y hora en un ISO con la zona de Guatemala: 2026-11-16T08:30:00-06:00 */
export function aFechaHoraIso(dia: string, horario: string): string {
  return `${dia}T${horario}:00${DESFASE_GUATEMALA}`;
}

/** Para buscar sin importar mayúsculas ni tildes: "analisis" encuentra "Análisis". */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
