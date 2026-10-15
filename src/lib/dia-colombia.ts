/**
 * EL PUENTE ENTRE UN INSTANTE Y UN DÍA DE COLOMBIA — módulo HOJA
 * ==============================================================
 *
 * Tres clases de fecha, y mezclarlas fue la sexta diferencia local-contra-Vercel:
 *
 *   1. DÍA PURO — lo que una persona teclea. La fecha de un acto, de un gasto,
 *      de un ingreso, la vigencia de una resolución, el periodo de un reporte.
 *      Sin hora y sin zona. Columna `DATE`, cadena `AAAA-MM-DD`, comparada
 *      lexicográficamente. **Nunca se convierte.**
 *   2. INSTANTE — lo que el sistema anota solo. `created_at`, el acceso al
 *      enlace del contador, la subida de un archivo. UTC, comparado como
 *      instante.
 *   3. EL PUENTE — un instante convertido al día de Bogotá **en el momento de
 *      usarlo**. La fecha por defecto de un acto, la del código de
 *      trazabilidad, el año del pie.
 *
 * > **Lo que una persona escribe es un día. Lo que el sistema anota por su
 * > cuenta es un instante.**
 *
 * ⚠ POR QUÉ ESTO ES UNA FUNCIÓN Y NO LA VARIABLE `TZ`.
 *
 * La tentación era poner `TZ=America/Bogota` y terminar. Se midió antes de
 * moverlo, y la medición mató el arreglo: las fechas van en DOS DIRECCIONES
 * OPUESTAS según de dónde vengan.
 *
 * | de dónde viene          | hoy (TZ=UTC)      | con TZ=America/Bogota |
 * |-------------------------|-------------------|-----------------------|
 * | escrita `'2026-12-31'`  | 31 dic 2026  ✓    | **30 dic 2026**  ✗    |
 * | escrita `'2027-01-01'`  | año 2027     ✓    | **año 2026**     ✗    |
 * | reloj, 31 dic 20:00 COL | **1 ene 2027** ✗  | 31 dic 2026      ✓    |
 *
 * Una variable de entorno cambia los doce sitios a la vez, en silencio, y quien
 * lea el código después no sabe cuál de los doce quería qué. El puente existe
 * UNA VEZ, con nombre, y se llama solo donde hace falta.
 *
 * ⚠ Y MIGRAR LA COLUMNA A `DATE` NO BASTA. Prisma devuelve un `DATE` como un
 * `Date` de JavaScript a medianoche UTC: con `TZ=America/Bogota`,
 * `.getDate()` sobre `2026-12-31` da **30**. El patrón completo son dos piezas,
 * columna `DATE` **y** lectura como cadena con `toISOString().slice(0, 10)`.
 * Eso es lo que `notariales/datos.ts` ya hacía bien antes de esto.
 */

/** El desplazamiento de Colombia. No tiene horario de verano desde 1993. */
const COLOMBIA = 'America/Bogota'

/**
 * El día de Colombia de un instante, como `AAAA-MM-DD`.
 *
 * Usa `Intl` y no componentes locales a propósito: el resultado no depende de
 * la zona del proceso, que es la única forma de que dé lo mismo en esta máquina
 * y en Vercel. El arnés lo comprueba corriendo con `TZ=UTC` y con
 * `TZ=America/Bogota` y exigiendo el mismo resultado.
 */
export function diaEnColombia(instante: Date = new Date()): string {
  // `en-CA` da AAAA-MM-DD, que es justo el formato que se compara como cadena.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instante)
}

/** Hoy en Colombia, como `AAAA-MM-DD`. El caso de uso más común del puente. */
export const hoyEnColombia = (): string => diaEnColombia()

/** El año de Colombia de un instante. Para el pie, las FAQ y los reportes. */
export function anioEnColombia(instante: Date = new Date()): number {
  return Number(diaEnColombia(instante).slice(0, 4))
}

/**
 * Un día puro leído de la base o de un formulario, como cadena.
 *
 * Prisma devuelve una columna `DATE` como `Date` a medianoche UTC, así que
 * `toISOString()` recorta el día exacto sin pasar por la zona del proceso. Es
 * la misma función que `notariales/datos.ts` tenía en privado, y vive aquí para
 * que el módulo financiero use la que ya estaba bien.
 */
export function diaPuro(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return null
}

/** El año de un día puro. Sin `Date` de por medio, así que sin zona. */
export function anioDelDia(v: unknown): number | null {
  const d = diaPuro(v)
  return d === null ? null : Number(d.slice(0, 4))
}

/**
 * Resta meses de CALENDARIO en Bogotá y devuelve el instante equivalente.
 *
 * ⚠ RESTAR 365 DÍAS NO ES «DOCE MESES». La retención de datos personales se
 * cuenta en meses: «todo acceso de hace más de doce meses se anonimiza». Doce
 * meses desde el 29 de febrero, o desde el 31 de marzo, no son 365 días ni
 * 360; son la misma fecha del mes correspondiente, y cuando ese día no existe
 * el calendario lo resuelve hacia atrás.
 *
 * Y el corte se compara contra una columna de INSTANTE —`accesos.fecha` es
 * cuándo ocurrió el acceso—, así que el camino es: tomar hoy, pasarlo al día de
 * Bogotá, restar los meses como calendario, y volver a instante. Lo que estaba
 * mal era `d.setMonth(d.getMonth() - 12)`: aritmética de calendario sobre
 * componentes LOCALES, que da un corte distinto en cada zona.
 */
export function mesesAntesEnColombia(meses: number, desde: Date = new Date()): Date {
  const dia = diaEnColombia(desde)
  const [a, m, d] = dia.split('-').map(Number)
  const total = (a! * 12 + (m! - 1)) - meses
  const anio = Math.floor(total / 12)
  const mes = total % 12
  /* El día puede no existir en el mes destino —31 de marzo menos un mes—. Se
   * recorta al último día de ese mes, que es lo que hace un calendario y no lo
   * que hace `setMonth`, que se desborda al mes siguiente. */
  const ultimo = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate()
  const diaFinal = Math.min(d!, ultimo)
  const iso = `${String(anio).padStart(4, '0')}-${String(mes + 1).padStart(2, '0')}-` +
    `${String(diaFinal).padStart(2, '0')}`
  /* Medianoche de ese día EN COLOMBIA, como instante. Colombia es UTC−5 fijo. */
  return new Date(`${iso}T00:00:00-05:00`)
}

/**
 * Los dos extremos de un día puro, como instantes, para comparar contra
 * columnas de instante. `desde` incluye y `hasta` excluye: media abierta, que
 * es la única forma de no perder ni duplicar un milisegundo en la frontera.
 */
export function limitesDelDia(dia: string): { desde: Date; hasta: Date } {
  return {
    desde: new Date(`${dia}T00:00:00-05:00`),
    hasta: new Date(`${siguienteDia(dia)}T00:00:00-05:00`),
  }
}

/** El día siguiente de un día puro, sin pasar por la zona del proceso. */
export function siguienteDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number)
  const t = new Date(Date.UTC(a!, m! - 1, d! + 1))
  return t.toISOString().slice(0, 10)
}

/* ══ ESCRIBIR UN DÍA PURO ═══════════════════════════════════════
 *
 * ⚠ LA OTRA DIRECCIÓN, y es la que se nos pasó entera.
 *
 * El barrido del 2026-10-15 buscó dónde se LEEN componentes locales de un
 * `Date` —`getFullYear`, `getMonth`, `getDate`— y encontró doce sitios. Nunca
 * buscó dónde se ESCRIBE un INSTANTE en una columna de DÍA. Son dos preguntas y
 * solo se corrió una.
 *
 * Al correr la segunda aparecieron CINCO escrituras, dos de ellas en archivos
 * que ya se creían revisados. Y la aritmética es implacable: un
 * `fecha_cierre: new Date()` a las 19:00 de Colombia produce el instante
 * `2026-10-16T00:00:00.000Z`, y una columna `DATE` guarda el **16**. El día real
 * era el 15.
 *
 * Por eso estos dos ayudantes existen con nombre: escribir «el día de hoy» en
 * una columna de día no es `new Date()`.
 */

/**
 * El día de HOY en Colombia, listo para escribir en una columna `DATE`.
 *
 * Devuelve la medianoche UTC de ese día, que es exactamente lo que una columna
 * `DATE` guarda: ni se corre al día siguiente por la tarde ni depende de la
 * zona del proceso.
 */
export function hoyComoDiaPuro(): Date {
  return new Date(`${hoyEnColombia()}T00:00:00Z`)
}

/**
 * Un día que viene de fuera —del formulario, de otra capa— listo para escribir
 * en una columna `DATE`. `null` si viene vacío.
 *
 * Normaliza al día ANTES de construir el instante: si llega un ISO con hora,
 * recortarlo en UTC convertiría un «15 a las 20:00 de Colombia» en el 16. Así
 * el día guardado es el día escrito, venga como venga.
 */
export function diaComoFecha(v: unknown): Date | null {
  const dia = diaPuro(v)
  if (dia === null) return null
  const d = new Date(`${dia}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}
