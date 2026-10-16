#!/usr/bin/env node
/**
 * EL ENLACE DEL CONTADOR — LA DEUDA IMPRESA, Y LA PROMESA VIGILADA
 * ===============================================================
 *
 * El 2026-10-16 se fue al dato a preguntar por qué `periodo_desde` y
 * `periodo_hasta` estaban vacías, y la respuesta no era la esperada: **el enlace
 * del contador no existe**. Hay tabla y hay política publicada; no hay ruta, no
 * hay token+PIN y no hay filtro de periodo.
 *
 * ⚠ LO GRAVE NO ERA LA COLUMNA VACÍA, ERA LO ESCRITO ALREDEDOR. Tres textos
 * hablaban de ello en PRESENTE:
 *
 *   1. El comentario del esquema: «fuera de este rango no devuelve nada», sobre
 *      un filtro inexistente. Lo lee quien vaya a construirlo y cree que está.
 *   2. La política de tratamiento de datos, PÚBLICA en
 *      /politica-tratamiento-datos, sección 4: «el acceso exige un enlace
 *      privado y un PIN», «queda limitado a un periodo contable concreto». Un
 *      documento legal describiendo un tratamiento que no se hace.
 *   3. El módulo de retención, que decía ser «lo que hace cierta esa frase».
 *
 * Este guión existe para que esa falsedad no pueda volver, y vigila LAS DOS
 * DIRECCIONES —la misma forma que el detector de fechas—:
 *
 *   · MIENTRAS NO EXISTA: los tres textos tienen que decir que no existe.
 *   · CUANDO EXISTA: los tres tienen que dejar de decirlo, y la ruta tiene que
 *     filtrar de verdad por `periodo_desde`/`periodo_hasta`.
 *
 * Un guión que solo vigilara la primera dirección convertiría la advertencia en
 * la siguiente mentira el día que se construya.
 *
 *     node scripts/verificar-enlace-contador.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ESQUEMA   = 'prisma/schema.prisma'
const POLITICA  = 'src/app/politica-tratamiento-datos/page.tsx'
const RETENCION = 'src/lib/retencion-accesos-contador.ts'
const CRON      = 'src/app/api/cron/purge-visitas/route.ts'

const leer = p => (existsSync(p) ? readFileSync(p, 'utf8') : '')

/* ── ¿EXISTE EL ENLACE? Se mide, no se recuerda. ─────────────────────────────
 *
 * La señal es una ruta de `src/app` que consulte la tabla. No basta con que
 * alguien nombre el modelo: `retencion-accesos-contador.ts` lo nombra y es la
 * retención, no el enlace. */
function rutasQueConsultanElEnlace() {
  const halladas = []
  const recorrer = dir => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) { recorrer(p); continue }
      if (!/\.(ts|tsx)$/.test(e)) continue
      if (/prisma\.enlaceContador\b/.test(readFileSync(p, 'utf8'))) {
        halladas.push(p.split('\\').join('/'))
      }
    }
  }
  if (existsSync('src/app')) recorrer('src/app')
  return halladas
}

const rutas  = rutasQueConsultanElEnlace()
const EXISTE = rutas.length > 0

const esquema   = leer(ESQUEMA)
const politica  = leer(POLITICA)
const retencion = leer(RETENCION)
const cron      = leer(CRON)
const fallos    = []

/** Las marcas que dicen «todavía no» en cada uno de los tres textos. */
const MARCAS = [
  { archivo: ESQUEMA, texto: esquema, marca: /NO CONSTRUIDO/,
    nota: 'el comentario del modelo EnlaceContador' },
  { archivo: POLITICA, texto: politica, marca: /(todavía|aún) no está en funcionamiento/i,
    nota: 'la sección 4 de la política PÚBLICA' },
  { archivo: RETENCION, texto: retencion, marca: /SIN ESCRITOR/,
    nota: 'el módulo de retención' },
]

console.log('\n══ ENLACE DEL CONTADOR ══════════════════════════════════════')

/* ── LAS TRES PIEZAS, IMPRESAS CON SU ESTADO REAL ───────────────────────────
 * Es la razón por la que se pidió el módulo financiero: mandarle al contador un
 * enlace de solo lectura de un periodo, con descarga. Va DESPUÉS del editor de
 * tramos; este guión no lo construye, solo impide que parezca hecho. */
const codigoDeLasRutas = rutas.map(leer).join('') + leer('src/lib/enlace-contador.ts')
const PIEZAS = [
  ['ruta pública que acepte el token',       EXISTE],
  ['token + PIN y sesión con scope propio',  /pinHash|verificarPin/.test(codigoDeLasRutas)],
  ['consulta ACOTADA a periodo_desde/hasta', /periodo_desde/.test(codigoDeLasRutas)],
]
for (const [que, hecha] of PIEZAS) console.log(`  ${hecha ? '✅' : '⬜'}  ${que}`)
console.log(`  ${PIEZAS.filter(p => p[1]).length} de ${PIEZAS.length} piezas construidas.`)

if (!EXISTE) {
  console.log('\n  El enlace NO existe. Lo que se vigila es que los textos no digan')
  console.log('  lo contrario —sobre todo la política, que es pública—.')
  for (const m of MARCAS) {
    if (m.marca.test(m.texto)) { console.log(`  ✓ ${m.nota} lo declara pendiente.`); continue }
    fallos.push(`${m.archivo}: ${m.nota} no dice que el enlace no existe.`)
  }
  /* El cron corre cada noche sobre una tabla que nadie escribe. Su cero no es
   * evidencia de retención, y el mensaje está obligado a decirlo. */
  if (!/nada que anonimizar/i.test(cron + retencion)) {
    fallos.push(`${CRON}: el mensaje no distingue «0 porque la retención funciona» de «0 porque no hay nada».`)
  }
} else {
  console.log(`\n  El enlace EXISTE (${rutas.join(', ')}).`)
  console.log('  Ahora se vigila lo contrario: que ningún texto siga llamándolo')
  console.log('  pendiente y que la consulta acote de verdad.')
  for (const m of MARCAS) {
    if (!m.marca.test(m.texto)) continue
    fallos.push(`${m.archivo}: el enlace ya existe y ${m.nota} sigue diciéndolo pendiente.`)
  }
  if (!PIEZAS[2][1]) {
    fallos.push('la ruta del enlace no menciona `periodo_desde`: el alcance por periodo es' +
      ' justo lo que la política PÚBLICA promete, y sin filtro esa promesa es falsa.')
  }
  if (!PIEZAS[1][1]) fallos.push('no se ve la verificación del PIN: la política promete enlace + PIN.')
  /* Y LO QUE EL EXTRACTO NO PUEDE LLEVAR. La política §4 dice que el enlace
   * expone ingresos, egresos y retenciones —con identificación de terceros,
   * que es indispensable para declarar— pero NO el registro de visitas ni las
   * conversaciones con Mac: son otra finalidad. Esto es lo único de los tres
   * requisitos que se puede leer en el código. */
  const PROHIBIDO = [
    ['prisma.visita', 'el registro de visitas a inmuebles'],
    ['prisma.conversation', 'las conversaciones con el agente Mac'],
    ['prisma.message', 'los mensajes del agente Mac'],
  ]
  for (const [llamada, que] of PROHIBIDO) {
    if (!codigoDeLasRutas.includes(llamada)) continue
    fallos.push(`la ruta del enlace consulta \`${llamada}\`: la política PÚBLICA excluye ${que} ` +
      'del extracto del contador.')
  }
}

if (fallos.length) {
  console.log('')
  for (const f of fallos) console.log(`  ✗ ${f}`)
  console.log('\n  Lo escrito y lo construido se separaron. Uno de los dos miente.')
  console.log('═════════════════════════════════════════════════════════════\n')
  process.exit(1)
}
console.log('\n  ✓ lo escrito y lo construido dicen lo mismo.')
console.log('═════════════════════════════════════════════════════════════\n')
