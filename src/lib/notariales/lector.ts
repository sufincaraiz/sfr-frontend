/**
 * QUIÉN LEYÓ ESTA CIFRA, Y CUÁNTO VALEN DOS LECTURAS JUNTAS
 * =========================================================
 *
 * Nace el 2026-10-27. Hasta entonces `asistente`, `claude`, `titular` y
 * `supernotariado` caían todos en la misma casilla —MARCADOR— de `firma.ts`. Lo
 * bueno era que ninguno acreditaba como persona; lo malo, que eran
 * indistinguibles, y la página no podía decir lo único que importa:
 *
 *   > Dos lecturas de asistente NO equivalen a una de asistente más una de
 *   > persona. Pueden compartir el mismo error.
 *
 * Y el caso no es hipotético. La primera lectura del documento de parámetros
 * dice en su cabecera que la hizo «el titular», y los cuatro commits que la
 * escribieron están coautorizados por un asistente. Si la segunda lectura
 * también la hace un asistente, el cotejo compara dos lecturas que pueden ser
 * la misma lectura dos veces.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAS CLASES, de más a menos peso
 *
 *   ENTIDAD        la entidad que emitió la norma confirma la cifra. Se escribe
 *                  `entidad:<dominio>` y el dominio tiene que ser una fuente
 *                  oficial. Explícito a propósito: «supernotariado» a secas no
 *                  se adivina, se rechaza con el formato correcto en el mensaje.
 *   PERSONA        un correo. Una persona identificable que responde de ello.
 *   ASISTENTE      un asistente de IA. Útil, y NO independiente de otro.
 *   MARCADOR       `titular`, `precarga`… (los de `firma.ts`): alguien, sin
 *                  identificar. No se puede saber si es otra persona.
 *   NO_RECONOCIDO  una cadena que no es nada de lo anterior. No se supone nada.
 *   AUSENTE        nadie declaró quién leyó.
 *
 * Módulo HOJA: sin `@/`, sin `enum`, sin propiedades de constructor.
 */
import { MARCADORES } from './firma.ts'
import { FUENTES_OFICIALES } from './catalogo.ts'

export type ClaseDeLector =
  | 'ENTIDAD' | 'PERSONA' | 'ASISTENTE' | 'MARCADOR' | 'NO_RECONOCIDO' | 'AUSENTE'

/** El peso de cada clase. Una pareja de lecturas vale lo que su mejor lector. */
export const NIVEL: Record<ClaseDeLector, number> = {
  ENTIDAD: 4, PERSONA: 3, ASISTENTE: 2, MARCADOR: 1, NO_RECONOCIDO: 1, AUSENTE: 0,
}

/** Asistentes conocidos, lista CERRADA. También vale `asistente:<nombre>`. */
const ASISTENTES = ['asistente', 'claude']

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export interface Lector {
  clase: ClaseDeLector
  /** El valor normalizado: es la IDENTIDAD con la que se compara a dos lectores. */
  identidad: string
  /** Lo que se muestra. */
  etiqueta: string
}

export function clasificarLector(
  valor: string | null | undefined,
  dominiosOficiales: string[] = FUENTES_OFICIALES.map(f => f.dominio),
): Lector {
  const v = typeof valor === 'string' ? valor.trim() : ''
  const bajo = v.toLowerCase()

  if (!v) return { clase: 'AUSENTE', identidad: '', etiqueta: 'sin lector declarado' }

  if (CORREO.test(v)) return { clase: 'PERSONA', identidad: bajo, etiqueta: v }

  if (bajo.startsWith('entidad:')) {
    const dominio = bajo.slice('entidad:'.length).replace(/^www\./, '').trim()
    if (dominiosOficiales.map(d => d.toLowerCase()).includes(dominio)) {
      return { clase: 'ENTIDAD', identidad: `entidad:${dominio}`, etiqueta: `la entidad emisora (${dominio})` }
    }
    /* Un dominio que no es fuente oficial NO sube a ENTIDAD: «entidad:» no es
     * una palabra mágica, es una afirmación que hay que poder respaldar. */
    return {
      clase: 'NO_RECONOCIDO', identidad: bajo,
      etiqueta: `«${v}» — ${dominio || '(vacío)'} no es una fuente oficial`,
    }
  }

  if (ASISTENTES.includes(bajo) || bajo.startsWith('asistente:')) {
    return { clase: 'ASISTENTE', identidad: bajo, etiqueta: `un asistente de IA (${v})` }
  }

  const marcador = MARCADORES[bajo]
  if (marcador) return { clase: 'MARCADOR', identidad: bajo, etiqueta: `${v} — ${marcador}` }

  return {
    clase: 'NO_RECONOCIDO', identidad: bajo,
    etiqueta:
      `«${v}» — no reconocido. Una persona se escribe con su correo; la entidad que ` +
      'emitió la norma, como entidad:<dominio>; un asistente, como «asistente».',
  }
}

export interface VeredictoDeLecturas {
  /** El peso de la mejor de las dos lecturas. */
  nivel: number
  /** ¿Son dos lecturas de verdad, o pueden ser la misma dos veces? */
  independientes: boolean
  /** Lo que la página dice, tal cual. */
  texto: string
  lectores: [Lector, Lector]
}

/**
 * ¿Cuánto valen dos lecturas JUNTAS?
 *
 * ⚠ Lo que esta función existe para impedir es sumar. Dos lecturas no son el
 * doble de una: si las hizo el mismo lector, o dos asistentes, pueden compartir
 * el mismo error, y entonces son UNA lectura con dos firmas. El orden de las
 * comprobaciones es el que decide eso, y va de lo que más resta a lo que más
 * suma.
 */
export function veredictoDeLecturas(
  a: string | null | undefined,
  b: string | null | undefined,
  dominiosOficiales?: string[],
): VeredictoDeLecturas {
  const la = clasificarLector(a, dominiosOficiales)
  const lb = clasificarLector(b, dominiosOficiales)
  const nivel = Math.max(NIVEL[la.clase], NIVEL[lb.clase])
  const lectores: [Lector, Lector] = [la, lb]
  const r = (independientes: boolean, texto: string): VeredictoDeLecturas =>
    ({ nivel, independientes, texto, lectores })

  if (la.clase === 'AUSENTE' || lb.clase === 'AUSENTE') {
    return r(false, 'una de las dos lecturas no declara quién la hizo, así que no se puede saber si son dos')
  }
  if (la.identidad === lb.identidad) {
    return r(false, `las dos lecturas las hizo el mismo lector (${la.etiqueta}): es una lectura, no dos`)
  }
  if (la.clase === 'ASISTENTE' && lb.clase === 'ASISTENTE') {
    return r(false, 'dos lecturas de asistente: pueden compartir el mismo error')
  }
  const entidad = [la, lb].find(l => l.clase === 'ENTIDAD')
  if (entidad) return r(true, `confirmada por ${entidad.etiqueta}`)
  const persona = [la, lb].find(l => l.clase === 'PERSONA')
  if (persona) {
    const otro = persona === la ? lb : la
    return r(true, `una lectura de persona (${persona.etiqueta}) y otra de ${otro.etiqueta}`)
  }
  return r(false,
    'ninguna de las dos lecturas es de una persona identificable ni de la entidad emisora: ' +
    'no se puede saber si son independientes')
}
