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
import { readFileSync } from 'node:fs'

/**
 * `efecto` dice qué pasa si `TZ` pasa a `America/Bogota`. Es lo que hay que
 * saber ANTES de moverlo, y por eso va por sitio y no en una frase general.
 */
const SITIOS = [
  /* ── Cambia QUÉ NORMA aplica ────────────────────────────────────────────── */
  { archivo: 'src/lib/notariales/calculo.ts', peso: 'NORMA',
    ancla: "`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`",
    que: 'la fecha del acto por defecto, cuando la simulacion no la trae',
    efecto: 'MEJORA. Hoy, una liquidacion de las 19:30 de Colombia del 1 de febrero se fecha el 2, ' +
      'que es justo la frontera de vigencia registral. Con Bogota se fecharia el 1, que es el dia real.' },

  /* ── Cambia el AÑO FISCAL ───────────────────────────────────────────────── */
  { archivo: 'src/lib/finanzas/ingresos.ts', peso: 'AÑO FISCAL',
    ancla: 'const anioFiscal = fechaCausacion.getFullYear()',
    que: 'el anio fiscal de un ingreso',
    efecto: 'DEPENDE DEL ORIGEN. Si la fecha se teclea, hoy acierta y con Bogota se iria un dia atras; ' +
      'si viene del reloj, hoy falla las ultimas cinco horas del dia y con Bogota acierta.' },
  { archivo: 'src/lib/finanzas/completar.ts', peso: 'AÑO FISCAL',
    ancla: 'const estado = await estadoDelAnio(e.fecha.getFullYear())',
    que: 'contra que anio fiscal se valida un gasto al completarlo',
    efecto: 'Igual que el anterior: el 1 de enero es el dia donde cambia de anio.' },
  { archivo: 'src/lib/finanzas/parametros.ts', peso: 'AÑO FISCAL',
    ancla: 'return fecha.getFullYear()',
    que: 'de que anio son los parametros que aplican',
    efecto: 'Igual. Un parametro del anio equivocado no es un redondeo: es otra tarifa.' },

  /* ── Cambia el PERIODO de un reporte ────────────────────────────────────── */
  { archivo: 'src/lib/finanzas/reportes.ts', peso: 'PERIODO',
    ancla: 'export function periodoDelAnio(anio = new Date().getFullYear()): Periodo {',
    que: 'el anio por defecto de un reporte',
    efecto: 'Cinco horas al ano el reporte abre con el anio siguiente. Molesto, no grave: se elige a mano.' },
  { archivo: 'src/lib/finanzas/egresos.ts', peso: 'PERIODO',
    ancla: 'const desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)',
    que: 'el primer dia del mes en curso, para listar',
    efecto: 'Las ultimas cinco horas del ultimo dia del mes, la lista arranca en el mes siguiente ' +
      'y los gastos de ese dia no aparecen.' },

  /* ── Cambia la RETENCIÓN de datos personales ────────────────────────────── */
  { archivo: 'src/lib/retencion-accesos-contador.ts', peso: 'RETENCION',
    ancla: 'd.setMonth(d.getMonth() - MESES_RETENCION_ACCESOS)',
    que: 'el corte de los doce meses para anonimizar accesos',
    efecto: 'Un dia de diferencia en el corte. Hoy la tabla tiene 0 filas, asi que no mueve nada.' },
  { archivo: 'src/lib/retencion-visitas.ts', peso: 'RETENCION',
    ancla: 'd.setMonth(d.getMonth() - MESES_AVISO)',
    que: 'el corte del aviso de retencion de visitas',
    efecto: 'Un dia de diferencia en el corte.' },

  /* ── Cambia un IDENTIFICADOR impreso ───────────────────────────────────── */
  { archivo: 'src/lib/notariales/trazabilidad.ts', peso: 'IMPRESO',
    ancla: 'const fecha = `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`',
    que: 'la fecha del codigo de trazabilidad que lleva el PDF',
    efecto: 'El PDF diria el dia de Colombia en vez del del servidor. Es lo que el lector espera.' },

  /* ── Solo cosmético: el año de un pie o un desplegable ──────────────────── */
  { archivo: 'src/components/layout/Footer.tsx', peso: 'COSMETICO',
    ancla: 'new Date().getFullYear()', que: 'el anio del pie de pagina',
    efecto: 'Cinco horas al ano el pie diria el anio siguiente.' },
  { archivo: 'src/lib/faq-data.ts', peso: 'COSMETICO',
    ancla: 'const ANIO = new Date().getFullYear()', que: 'el anio que se cita en las FAQ',
    efecto: 'Igual que el pie, pero esto lo lee un buscador.' },
  { archivo: 'src/app/admin/notariales/page.tsx', peso: 'COSMETICO',
    ancla: 'useState(new Date().getFullYear())', que: 'el anio propuesto al sembrar uno nuevo',
    efecto: 'Cinco horas al ano propone el siguiente. Se escribe a mano.' },
]

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

const PESOS = ['NORMA', 'AÑO FISCAL', 'PERIODO', 'RETENCION', 'IMPRESO', 'COSMETICO']

console.log('\n══ FECHAS EN LA ZONA DEL SERVIDOR ════════════════════════════')
console.log('  Nada fija TZ. Esta maquina es UTC-5 y Vercel es UTC.')
console.log(`  ${SITIOS.length} sitios leen componentes locales de una fecha:\n`)
for (const p of PESOS) {
  const suyos = SITIOS.filter(s => s.peso === p)
  if (!suyos.length) continue
  console.log(`  ${p} — ${suyos.length}`)
  for (const s of suyos) console.log(`     ${s.archivo}  ·  ${s.que}`)
}
const graves = SITIOS.filter(s => s.peso === 'NORMA' || s.peso === 'AÑO FISCAL').length
console.log(`\n  ${graves} de los ${SITIOS.length} cambian qué norma aplica o de qué año fiscal es un movimiento.`)
console.log('  TZ=America/Bogota NO es el arreglo: arregla las fechas del reloj y')
console.log('  rompe las tecleadas. Ver la cabecera de este archivo.')

if (problemas.length) {
  console.log(`\n  ✗ el inventario no cuadra con el codigo (${problemas.length}):`)
  for (const p of problemas) console.log(`     ${p}`)
  console.log('')
  process.exit(1)
}
console.log('\n  ✓ cada ancla existe.\n')
