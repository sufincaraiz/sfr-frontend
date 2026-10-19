/**
 * QUIÉN FIRMA UN ACTO — módulo HOJA
 * =================================
 *
 * Una cifra equivocada se recalcula. **Quién la cargó, no.** La firma es el
 * único dato del sistema que no se puede reconstruir después: si se pierde o se
 * sustituye, no hay forma de derivarla de nada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ LO QUE SE CREYÓ Y NO ERA — corrección del 2026-10-19
 *
 * El barrido de guardas desarmadas reportó cinco llamadas con
 * `s.email ?? 'admin'` como «falsean quién actúa». **Medido después: no pueden
 * firmar nada.** `AdminSessionUser.email` es `string` —no opcional— y viene de
 * `Admin.email String @unique`, que es NOT NULL. El `??` nunca se alcanza:
 *
 *   · actos firmados por `'admin'` en producción: **0**
 *   · años notariales: 1, en BORRADOR, `activado_por = null`
 *   · respaldos normativos: 0
 *   · fuentes normativas: 8 — 7 `"precarga"` y 1 `"titular"`
 *
 * Clasifiqué desde la expresión sin comprobar si la rama es alcanzable, que es
 * el mismo error que la mutación no-op: un cambio sintácticamente real sobre
 * código inalcanzable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Y AUN ASÍ ESTE MÓDULO EXISTE, por dos razones que la medición no cancela:
 *
 * 1. **La protección no puede depender de que un tipo siga siendo obligatorio.**
 *    El día que `email` sea opcional —SSO, un usuario de servicio, una
 *    migración— el `?? 'admin'` volvería a estar vivo **sin que nada avise**.
 *    Quitarlo convierte ese futuro en un error de compilación.
 * 2. **La columna de firma guarda TRES clases de valor y nada las distingue.**
 *    Hoy hay marcadores (`"precarga"`, `"titular"`) donde mañana habrá correos.
 *    «Firmado por el titular» y «firmado por un valor por defecto» se leen
 *    igual, y son cosas distintas.
 */

/** Las clases de valor que puede tener una columna de firma. */
export type ClaseDeFirma = 'PERSONA' | 'MARCADOR' | 'AUSENTE'

export interface Firma {
  clase: ClaseDeFirma
  /** El valor tal cual, para no perderlo nunca. */
  valor: string | null
  /** Qué decir en pantalla, sin adornos. */
  etiqueta: string
  /** `true` solo si una persona identificable respondió por este acto. */
  acredita: boolean
}

/**
 * MARCADORES CONOCIDOS, lista cerrada y con su significado.
 *
 * No son defectos: `"precarga"` dice la verdad —esas siete fuentes las puso la
 * siembra, no una persona— y es mejor que un correo inventado. Lo que no vale
 * es que se lean como si alguien hubiera respondido por ellas.
 */
export const MARCADORES: Record<string, string> = {
  precarga: 'puesto por la siembra, no por una persona',
  titular: 'el titular, sin correo registrado',
  admin: '⚠ valor por defecto: no se registró quién',
  sistema: 'escrito por un proceso automático',
  cron: 'escrito por una tarea programada',
}

/**
 * Clasifica un valor de firma. No lanza: describir no es validar, y la pantalla
 * necesita poder mostrar lo que hay aunque sea un marcador.
 */
export function clasificarFirma(valor: string | null | undefined): Firma {
  const v = typeof valor === 'string' ? valor.trim() : ''
  if (v === '') {
    return { clase: 'AUSENTE', valor: null, etiqueta: 'sin firma', acredita: false }
  }
  const marcador = MARCADORES[v.toLowerCase()]
  if (marcador) {
    return { clase: 'MARCADOR', valor: v, etiqueta: `${v} — ${marcador}`, acredita: false }
  }
  /* Un correo es la única forma que hoy identifica a una persona en este
   * sistema: la sesión lo trae de `admins.email`, que es único. No se valida
   * contra un RFC: basta con que distinga «alguien» de «algo». */
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
    return { clase: 'PERSONA', valor: v, etiqueta: v, acredita: true }
  }
  /* Ni marcador conocido ni correo: se dice así en vez de suponer. Un valor
   * desconocido en una columna de firma es lo más parecido a una firma falsa. */
  return {
    clase: 'MARCADOR',
    valor: v,
    etiqueta: `${v} — no es un correo ni un marcador conocido`,
    acredita: false,
  }
}

/** Se lanza cuando se intenta firmar un acto sin identidad. */
export class SinIdentidadParaFirmar extends Error {
  /* ⚠ CAMPO DECLARADO, no una «parameter property» (`constructor(public acto)`).
   * Node no la soporta en modo strip-only, y estos módulos hoja TIENEN que
   * poder correr con `node` directo: es lo que permite que el arnés ejercite
   * el código real y no una copia. Lo cazo el arnés en el primer intento. */
  acto: string
  constructor(acto: string) {
    super(
      `No se puede ${acto} sin saber quién lo hace. La sesión no trae una identidad ` +
      'y la firma de un acto no se sustituye por un valor por defecto: una cifra ' +
      'equivocada se recalcula, quién la cargó no.',
    )
    this.name = 'SinIdentidadParaFirmar'
    this.acto = acto
  }
}

/**
 * PUERTA ÚNICA PARA FIRMAR. Detiene, **no sustituye**.
 *
 * Acepta los marcadores declarados —`precarga` es legítimo y verdadero— y
 * rechaza lo vacío. Lo que nunca puede pasar es que un acto quede firmado por
 * algo que nadie eligió.
 */
export function exigirFirma(valor: string | null | undefined, acto: string): string {
  const f = clasificarFirma(valor)
  if (f.clase === 'AUSENTE') throw new SinIdentidadParaFirmar(acto)
  /* `admin` está en MARCADORES para poder LEER los actos que ya lo tengan —hoy
   * cero— pero no para escribir nuevos: era justamente el valor por defecto. */
  if (f.valor?.toLowerCase() === 'admin') throw new SinIdentidadParaFirmar(acto)
  return f.valor!
}
