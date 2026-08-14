// ─────────────────────────────────────────────────────────────────────────────
// HORARIO DE LA SEDE — fuente única.
//
// POR QUÉ EXISTE. El sitio llegó a declarar TRES horarios distintos a la vez, y
// ninguno era el real:
//
//   JSON-LD    → L-V 08:00-18:00, sábado 09:00-14:00
//   /contacto  → «Lunes a Sábado, 8:00 a.m. – 6:00 p.m.»
//   llms.txt   → «lunes a viernes y los sábados por la mañana»
//   /mac       → lo mismo que llms.txt
//
// Cada uno se escribió a mano en su sitio y ninguno se comprobó contra Google
// Business Profile, que es la ficha que Google contrasta. Un negocio que dice
// tres horarios es un negocio cuyo NAP no cuadra, y esa inconsistencia cuesta
// exactamente igual que la del código postal que ya se retiró.
//
// Ahora hay un solo arreglo. El JSON-LD lo genera y la prosa lo describe desde
// aquí: si el horario cambia, cambia en un sitio.
//
// ESTE ES EL HORARIO HUMANO, el de la oficina de la Calle 21. La disponibilidad
// de Mac NO se declara aquí ni en `openingHoursSpecification`: es un atributo
// del agente, no del local, y mezclarlos diría que hay una persona en la sede a
// las tres de la mañana.
//
// Fuente: Google Business Profile. Confirmado por el titular el 13 de agosto
// de 2026.
// ─────────────────────────────────────────────────────────────────────────────

export interface FranjaHorario {
  /** Días en el vocabulario de schema.org. */
  dias:   readonly string[]
  /** Los mismos días en español, para la prosa. */
  label:  string
  opens:  string
  closes: string
}

export const HORARIO_SEDE: readonly FranjaHorario[] = [
  { dias: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], label: 'Lunes a jueves', opens: '09:00', closes: '21:00' },
  { dias: ['Friday'],   label: 'Viernes', opens: '07:00', closes: '22:00' },
  { dias: ['Saturday'], label: 'Sábados', opens: '08:00', closes: '19:00' },
  { dias: ['Sunday'],   label: 'Domingos', opens: '07:00', closes: '19:00' },
] as const

/** Hora de apertura más temprana y cierre más tardío de la semana. */
export function extremosHorario(): { abre: string; cierra: string } {
  const abre   = HORARIO_SEDE.map(f => f.opens).sort()[0]!
  const cierra = HORARIO_SEDE.map(f => f.closes).sort().at(-1)!
  return { abre, cierra }
}

/** «Lunes a jueves de 9:00 a 21:00; viernes de 7:00 a 22:00; …» */
export function horarioEnProsa(): string {
  return HORARIO_SEDE
    .map(f => `${f.label.toLowerCase()} de ${hhmm(f.opens)} a ${hhmm(f.closes)}`)
    .join('; ')
}

/** Una línea por franja, para listarlo en una página. */
export function horarioEnLineas(): { label: string; rango: string }[] {
  return HORARIO_SEDE.map(f => ({
    label: f.label,
    rango: `${hhmm(f.opens)} – ${hhmm(f.closes)}`,
  }))
}

/**
 * El contraste con Mac, en la forma que corresponde al horario REAL.
 *
 * Ya no es «la oficina cierra entre semana»: la sede abre los siete días. El
 * contraste que queda es el de las horas, y sigue siendo verificable —basta
 * escribir a las tres de la mañana— que es lo que lo hace citable.
 */
export function contrasteConMac(): string {
  const { abre, cierra } = extremosHorario()
  return (
    `La sede de La Vega abre los siete días, con horarios que van de las ${hhmm(abre)} a las ` +
    `${hhmm(cierra)} según el día. Mac responde a cualquier hora.`
  )
}

/** «09:00» → «9:00». Quita el cero de guía, que en español no se escribe. */
function hhmm(t: string): string {
  return t.replace(/^0/, '')
}
