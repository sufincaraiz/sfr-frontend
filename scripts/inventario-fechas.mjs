#!/usr/bin/env node
/**
 * DÓNDE SE LEE UNA FECHA EN LA ZONA DEL SERVIDOR
 * ==============================================
 *
 * Sexta diferencia local-contra-Vercel, y la primera que cambia **qué norma
 * aplica** y no solo qué cifra sale. Nada fija `TZ` en el repositorio: la
 * máquina de desarrollo es UTC−5 y Vercel es UTC, así que todo sitio que
 * construya o compare un día a partir de componentes locales de un `Date`
 * responde distinto en cada superficie.
 *
 * ⚠ Y FIJAR `TZ` NO ES EL ARREGLO. Medido el 2026-10-15, las fechas van en DOS
 * DIRECCIONES OPUESTAS según de dónde vengan:
 *
 *   · ESCRITA EN UN FORMULARIO. `new Date('2026-12-31')` se interpreta como
 *     medianoche UTC. Hoy, con TZ=UTC, el día sale 31 de diciembre —correcto—.
 *     Con TZ=America/Bogota saldría **30 de diciembre**, y `'2027-01-01'`
 *     caería en el **año fiscal 2026**.
 *   · DEL RELOJ. `new Date()` a las 20:00 de Colombia del 31 de diciembre da
 *     `2027-01-01T01:00Z`. Hoy, con TZ=UTC, se archiva en **2027** —incorrecto—.
 *     Con TZ=America/Bogota saldría 31 de diciembre, correcto.
 *
 * O sea: **TZ=America/Bogota arregla el segundo caso y rompe el primero.** El
 * arreglo no es una variable de entorno: es que un DÍA DEL CALENDARIO y un
 * INSTANTE son dos cosas distintas y hoy se guardan en la misma columna.
 *
 * EL ALCANCE, MEDIDO EN LA BASE DE PRODUCCIÓN el 2026-10-15 —no estimado—:
 *
 *   · `egresos`: 2 filas. Ninguna a medianoche UTC; **una** entre las 00:00 y
 *     las 05:00 UTC (`2026-09-22 00:36`), o sea capturada a las 19:36 de
 *     Colombia del 21 y archivada el 22. Con TZ=Bogota pasaría al 21. Mismo
 *     año fiscal.
 *   · `ingresos`: 0 filas.
 *   · `accesos_enlace_contador`: 0 filas, así que la anonimización a los doce
 *     meses no tiene nada que mover.
 *   · **Ninguna fecha guardada a medianoche UTC**: el caso que se rompería no
 *     tiene todavía una sola fila.
 *
 * La ventana para arreglarlo sin migrar datos es ahora.
 *
 *   node scripts/inventario-fechas.mjs
 */
import { readFileSync, globSync } from 'node:fs'

/**
 * `efecto` dice qué pasa si `TZ` pasa a `America/Bogota`. Es lo que hay que
 * saber ANTES de moverlo, y por eso va por sitio y no en una frase general.
 */
const SITIOS = [
  /* ══ EL PUENTE: un instante → el día de Colombia ═════════════════════ */
  { archivo: 'src/lib/notariales/calculo.ts', clase: 'PUENTE',
    ancla: '? diaEnColombia(hoy)',
    que: 'la fecha del acto por defecto',
    porque: 'un acto se firma en Colombia; con el reloj del servidor, las 19:30 del 1 de febrero se fechaban el 2' },
  { archivo: 'src/lib/notariales/trazabilidad.ts', clase: 'PUENTE',
    ancla: 'const fecha = diaEnColombia(f)',
    que: 'la fecha del codigo impreso en el PDF',
    porque: 'lo lee una persona en Colombia: el dia tiene que ser el suyo' },
  { archivo: 'src/components/layout/Footer.tsx', clase: 'PUENTE',
    ancla: '{anioEnColombia()} Su Finca',
    que: 'el anio del pie',
    porque: 'corre en el SERVIDOR, que en Vercel es UTC' },
  { archivo: 'src/lib/finanzas/egresos.ts', clase: 'PUENTE',
    ancla: 'const hoy = hoyEnColombia()',
    que: 'el primer dia del mes en curso, para listar',
    porque: 'las ultimas cinco horas del mes la lista arrancaba en el siguiente' },
  { archivo: 'src/lib/finanzas/reportes.ts', clase: 'PUENTE',
    ancla: 'export const anioFiscalEnCurso = (): number => anioEnColombia()',
    que: 'el anio fiscal en curso, separado de los limites del periodo',
    porque: 'periodoDelAnio era las dos clases a la vez y se partio' },
  { archivo: 'src/app/api/admin/notariales/route.ts', clase: 'PUENTE',
    ancla: 'anio_sugerido: Number(hoyEnColombia().slice(0, 4))',
    que: 'el anio propuesto al sembrar, decidido en el servidor',
    porque: 'el anio tarifario es un hecho sobre Colombia, no sobre donde este el visitante' },

  /* ══ DÍA PURO: cadena AAAA-MM-DD, sin Date de por medio ═══════════════ */
  { archivo: 'src/lib/finanzas/ingresos.ts', clase: 'DIA PURO',
    ancla: 'const anioFiscal = Number(diaCausacion.slice(0, 4))',
    que: 'el anio fiscal de un ingreso',
    porque: 'sale de la cadena; con el Date de una columna DATE, .getFullYear() se mueve con TZ' },
  { archivo: 'src/lib/finanzas/completar.ts', clase: 'DIA PURO',
    ancla: 'await estadoDelAnio(anioDelDia(e.fecha)!)',
    que: 'el anio contra el que se valida un gasto o un ingreso (4 sitios)',
    porque: 'idem: la columna es DATE y se lee como cadena' },
  { archivo: 'src/lib/finanzas/parametros.ts', clase: 'DIA PURO',
    ancla: 'const a = anioDelDia(fecha)',
    que: 'de que anio son los parametros que aplican',
    porque: 'un parametro del anio equivocado no es un redondeo: es otra tarifa' },
  { archivo: 'src/lib/finanzas/reportes.ts', clase: 'DIA PURO',
    ancla: 'return { desde: new Date(Date.UTC(anio, 0, 1)), hasta: new Date(Date.UTC(anio, 11, 31)) }',
    que: 'los limites de un periodo anual',
    porque: 'en hora local el 1 de enero empezaba a las 05:00 UTC y la madrugada entraba o salia' },
  { archivo: 'src/lib/faq-data.ts', clase: 'LITERAL',
    ancla: 'export const ANIO_FAQ = 2026',
    que: 'el anio citado en la portada',
    porque: 'era una constante de tiempo de BUILD; ahora es literal y verificar-anio-faq rompe el build' },

  /* ══ INSTANTE: duracion y calendario entre instantes ═════════════════ */
  { archivo: 'src/lib/retencion-accesos-contador.ts', clase: 'INSTANTE',
    ancla: 'return mesesAntesEnColombia(MESES_RETENCION_ACCESOS)',
    que: 'el corte de los doce meses para anonimizar accesos',
    porque: 'restar 365 dias no es doce meses, y setMonth sobre componentes locales daba otro corte por zona' },
  { archivo: 'src/lib/retencion-visitas.ts', clase: 'INSTANTE',
    ancla: 'return mesesAntesEnColombia(MESES_AVISO)',
    que: 'el corte del aviso de retencion de visitas',
    porque: 'idem' },
]

/* ══ EL DETECTOR, EN LAS DOS DIRECCIONES ═══════════════════════════
 *
 * ⚠ EL BARRIDO ORIGINAL SOLO HIZO UNA DE LAS DOS PREGUNTAS.
 *
 * Buscó dónde se LEEN componentes locales de un `Date` y encontró doce sitios.
 * Nunca buscó dónde se ESCRIBE un INSTANTE en una columna de DÍA. Al correr la
 * segunda pregunta aparecieron CINCO escrituras más, dos de ellas en archivos
 * que ya se creían revisados —una de ellas, el gasto capturado a las 20:00 del
 * 31 de diciembre que cambiaba de año fiscal—.
 *
 * > **La pregunta decide lo que se puede encontrar.** Un detector no tiene un
 * > punto ciego por descuido: lo tiene por la forma de lo que pregunta.
 *
 * SIN LISTA DE EXCEPCIONES. Hoy no queda ninguna de las dos formas, así que
 * cualquiera nueva rompe el build. Una excepción declarada es una afirmación
 * que nadie vuelve a comprobar; cero es una propiedad.
 */

/** Las nueve columnas de día puro, según la migración del 2026-10-15. */
const COLUMNAS_DIA = [
  'fecha', 'fecha_reembolso', 'fecha_causacion', 'fecha_recaudo',
  'periodo_desde', 'periodo_hasta', 'fecha_recibido', 'fecha_cierre', 'vigente_hasta',
]

/** El único archivo donde la zona de Colombia puede nombrarse. */
const EL_PUENTE = 'src/lib/dia-colombia.ts'

function sinComentarios(src) {
  const fuera = []
  let enBloque = false
  for (const l of src.split('\n')) {
    if (/^\s*\/\*/.test(l)) enBloque = true
    if (enBloque) { if (/\*\//.test(l)) enBloque = false; fuera.push(''); continue }
    if (/^\s*(\/\/|\*)/.test(l)) { fuera.push(''); continue }
    fuera.push(l.replace(/\/\/.*$/, ''))
  }
  return fuera
}

/* ── LO QUE EL DETECTOR NO VEÍA, Y POR QUÉ ────────────────────────────────────
 *
 * 2026-10-16, SEXTO PUNTO CIEGO. El detector buscaba componentes locales
 * (`getFullYear`, `getMonth`, `getDate`) y reportaba 0 lecturas. Pero había
 * SIETE sitios leyendo un día con `.toISOString().slice(0, 10)`, seis de ellos
 * publicando esa fecha —/nosotros, las cifras derivadas, los rangos de precio,
 * las respuestas directas, llms.txt y el `datePublished` del blog—.
 *
 * ⚠ LA MISMA EXPRESIÓN ES CORRECTA EN UN USO Y FALSA EN EL OTRO:
 *
 *   · sobre una columna de DÍA PURO —guardada a medianoche UTC— es la lectura
 *     correcta, y es invariante a la zona. Así se usa en todo el motor.
 *   · sobre `new Date()` —un INSTANTE, el ahora— da el día de UTC, que NO es el
 *     día de Colombia cinco horas al día.
 *
 * El detector vigilaba la EXPRESIÓN; el defecto estaba en el USO. No le faltaba
 * una regla: le faltaba saber DE DÓNDE VIENE EL VALOR.
 *
 * ── Y SÍ SE PUEDE DISTINGUIR, LA MITAD AUTOMÁTICAMENTE ──
 *
 *   (a) `new Date().toISOString()` es sintáctico: el origen está en la misma
 *       expresión. Rompe siempre —los siete casos eran de esta forma—.
 *   (b) `algo.toISOString().slice(0,10)` donde `algo` es una variable NO se
 *       puede decidir leyendo la línea: hay que saber de dónde salió `algo`.
 *       Para esos la guarda EXIGE UNA MARCA: `DIA PURO` en la línea o en las
 *       tres anteriores. Sin marca no se clasifica, y sin clasificar rompe.
 *
 * Exigir la marca no es burocracia: es la única forma de que el que escribe
 * declare el origen, que es justo el dato que el detector no puede deducir. Y
 * es la regla general de esta sesión —no clasificar y seguir: el descarte entra
 * en el artefacto medido—. */

/** Días leídos en UTC que están JUSTIFICADOS, con su razón. Lista cerrada. */
const UTC_JUSTIFICADO = [
  { archivo: 'src/app/admin/visibilidad-ia/page.tsx',
    razon: 'solo el nombre de un CSV descargado desde el panel; no se publica ni se compara' },
]

function detectar() {
  const archivos = globSync('src/**/*.{ts,tsx}')
  const lecturas = []
  const escrituras = []
  const sinOrigen = []
  const ahoraEnUtc = []
  /* `: new Date()` que TERMINA ahi: `new Date().toISOString()` es una cadena y
   * no un instante escrito en una columna. */
  const reEscritura = new RegExp(
    `\\b(${COLUMNAS_DIA.join('|')})\\s*:\\s*new Date\\(\\)\\s*[,)}]`)
  const reLectura = /\.(getFullYear|getMonth|getDate|getHours|getMinutes|getDay)\(\)/
  /* (a) el origen está en la expresión: es el AHORA, leído en UTC. */
  const reAhoraUtc = /new Date\(\)\s*\.toISOString\(\)/
  /* (b) cualquier otra lectura de DÍA a partir de un instante. */
  const reDia = /\.toISOString\(\)\s*\.\s*(slice\(\s*0\s*,\s*10\s*\)|split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\])/
  const MARCA = /DIA PURO|DÍA PURO/

  for (const f of archivos) {
    const norm = f.replace(/\\/g, '/')
    if (norm === EL_PUENTE) continue
    let src
    try {
      src = readFileSync(f, 'utf8')
    } catch {
      continue
    }
    const lineas = sinComentarios(src)
    const crudas = src.split('\n')
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i]
      if (!l.trim()) continue
      if (reLectura.test(l)) lecturas.push({ archivo: norm, linea: i + 1, texto: l.trim().slice(0, 86) })
      if (reDia.test(l)) {
        const justificado = UTC_JUSTIFICADO.some(j => j.archivo === norm)
        const caso = { archivo: norm, linea: i + 1, texto: l.trim().slice(0, 86) }
        if (reAhoraUtc.test(l)) {
          if (!justificado) ahoraEnUtc.push(caso)
        } else {
          /* La marca se busca en el ORIGINAL, con comentarios: es un comentario. */
          const vecindad = crudas.slice(Math.max(0, i - 3), i + 1).join('\n')
          if (!MARCA.test(vecindad) && !justificado) sinOrigen.push(caso)
        }
      }
      if (reEscritura.test(l)) escrituras.push({ archivo: norm, linea: i + 1, texto: l.trim().slice(0, 86) })
    }
  }
  return { lecturas, escrituras, sinOrigen, ahoraEnUtc }
}

/* ── la comprobación ─────────────────────────────────────────────────────── */

const cache = new Map()
const leer = f => {
  if (!cache.has(f)) {
    try {
      cache.set(f, readFileSync(f, 'utf8'))
    } catch {
      cache.set(f, null)
    }
  }
  return cache.get(f)
}

const problemas = []
for (const s of SITIOS) {
  const src = leer(s.archivo)
  if (src === null) { problemas.push(`no existe ${s.archivo}`); continue }
  if (!src.includes(s.ancla)) {
    problemas.push(`${s.archivo}: el ancla ya no esta -> «${s.ancla.slice(0, 56)}»`)
  }
}

const CLASES = ['PUENTE', 'DIA PURO', 'LITERAL', 'INSTANTE']

console.log('\n══ LAS TRES CLASES DE FECHA, SITIO POR SITIO ══════════════════')
console.log('  Nada fija TZ, y no hace falta: ninguno de estos sitios depende de ella.')
console.log(`  ${SITIOS.length} sitios, clasificados:\n`)
for (const c of CLASES) {
  const suyos = SITIOS.filter(x => x.clase === c)
  if (!suyos.length) continue
  console.log(`  ${c} — ${suyos.length}`)
  for (const x of suyos) console.log(`     ${x.archivo}  ·  ${x.que}`)
}
console.log('\n  Quien comprueba que el resultado no depende de la zona es')
console.log('  scripts/verificar-fechas-invariantes.mjs, sobre los DOS caminos:')
console.log('  el puente en memoria y lo que sale de la base.')

const { lecturas, escrituras, sinOrigen, ahoraEnUtc } = detectar()

console.log('\n══ EL DETECTOR, EN LAS DOS DIRECCIONES ══════════════════════')
console.log(`  LEE componentes locales de un Date:        ${lecturas.length}`)
console.log(`  ESCRIBE un instante en columna de dia:     ${escrituras.length}`)
console.log(`  LEE EL AHORA como dia de UTC:              ${ahoraEnUtc.length}`)
console.log(`  LEE un dia SIN DECLARAR DE DONDE VIENE:    ${sinOrigen.length}`)
if (UTC_JUSTIFICADO.length) {
  console.log(`  (${UTC_JUSTIFICADO.length} justificado(s), con su razon escrita en el guion)`)
}
for (const x of [...lecturas, ...escrituras, ...ahoraEnUtc, ...sinOrigen]) {
  console.log(`     ✗ ${x.archivo}:${x.linea}`)
  console.log(`        ${x.texto}`)
}
if (ahoraEnUtc.length) {
  console.log('\n  ✗ `new Date().toISOString()` da el dia de UTC, no el de Colombia:')
  console.log('    entre las 19:00 y medianoche publica la fecha de MANANA.')
  console.log('    Usa hoyEnColombia() de src/lib/dia-colombia.ts.')
}
if (sinOrigen.length) {
  console.log('\n  ✗ un dia leido de un instante SIN declarar su origen.')
  console.log('    Sobre una columna de DIA PURO es correcto; sobre el ahora, no.')
  console.log('    El detector no puede deducirlo: escribe `DIA PURO` en un')
  console.log('    comentario en la linea o en las tres anteriores, o usa el puente.')
}
if (lecturas.length || escrituras.length || ahoraEnUtc.length || sinOrigen.length) {
  console.log('\n  El dia de Colombia se nombra en src/lib/dia-colombia.ts y en ningun otro')
  console.log('  sitio. Si esto es legitimo, no lo declares aqui: usa el puente.')
  const partes = []
  if (lecturas.length) partes.push(`${lecturas.length} con componentes locales`)
  if (escrituras.length) partes.push(`${escrituras.length} escribiendo un instante en columna de dia`)
  if (ahoraEnUtc.length) partes.push(`${ahoraEnUtc.length} leyendo el ahora como dia de UTC`)
  if (sinOrigen.length) partes.push(`${sinOrigen.length} sin declarar el origen del valor`)
  problemas.push(`sitios por resolver: ${partes.join(' · ')}`)
} else {
  console.log('  ✓ ninguna de las CUATRO formas queda en el codigo.')
}

if (problemas.length) {
  console.log(`\n  ✗ el inventario no cuadra con el codigo (${problemas.length}):`)
  for (const p of problemas) console.log(`     ${p}`)
  console.log('')
  process.exit(1)
}
console.log('\n  ✓ cada ancla existe.\n')
