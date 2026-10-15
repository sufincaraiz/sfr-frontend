#!/usr/bin/env node
/**
 * LAS TRES CLASES DE FECHA — arnés del puente
 * ===========================================
 *
 * ⚠ ESTE ARNÉS TIENE QUE DAR EXACTAMENTE LA MISMA SALIDA CON `TZ=UTC` Y CON
 * `TZ=America/Bogota`. Si depende de la zona del proceso, el arreglo no está
 * hecho: es la regla de que una herramienta que mide no puede heredar su
 * configuración del entorno, aplicada al motor.
 *
 * Quien compara las dos pasadas es `scripts/verificar-fechas-invariantes.mjs`,
 * y por eso aquí no se imprime nada que cambie entre ejecuciones —ni la hora,
 * ni «hoy»—: solo instantes fijos y sus resultados.
 *
 *   node scripts/probar-fechas.mjs
 */
import {
  diaEnColombia, anioEnColombia, diaPuro, anioDelDia,
  mesesAntesEnColombia, limitesDelDia, siguienteDia,
} from '../src/lib/dia-colombia.ts'

let ok = 0
const fallos = []
const check = (nombre, cond, extra = '') => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`) }
  else { fallos.push(nombre); console.log(`  ✗ ${nombre} ${extra}`) }
}

console.log('\n══ EL PUENTE: UN INSTANTE → EL DÍA DE COLOMBIA ══')
/* Los casos son los que se midieron el 2026-10-15 y mataron la idea de fijar
 * TZ. Cada uno lleva el instante escrito con su desplazamiento, así que no
 * depende de la zona del proceso ni al construirlo. */
check('31 dic 18:00 de Colombia es el 31 de diciembre',
  diaEnColombia(new Date('2026-12-31T18:00:00-05:00')) === '2026-12-31',
  `(dio ${diaEnColombia(new Date('2026-12-31T18:00:00-05:00'))})`)
check('31 dic 20:00 de Colombia SIGUE siendo el 31, aunque en UTC ya sea el 1',
  diaEnColombia(new Date('2026-12-31T20:00:00-05:00')) === '2026-12-31',
  `(dio ${diaEnColombia(new Date('2026-12-31T20:00:00-05:00'))})`)
check('…y su año fiscal es 2026, no 2027',
  anioEnColombia(new Date('2026-12-31T20:00:00-05:00')) === 2026)
check('1 feb 19:30 de Colombia es el 1 de febrero, no el 2',
  diaEnColombia(new Date('2026-02-01T19:30:00-05:00')) === '2026-02-01',
  `(dio ${diaEnColombia(new Date('2026-02-01T19:30:00-05:00'))})`)
check('la medianoche justa de Colombia ya es el día nuevo',
  diaEnColombia(new Date('2026-02-02T00:00:00-05:00')) === '2026-02-02')
check('un minuto antes, todavía el anterior',
  diaEnColombia(new Date('2026-02-01T23:59:00-05:00')) === '2026-02-01')

console.log('\n══ DÍA PURO: NUNCA SE CONVIERTE ══')
check('una cadena se recorta y no se interpreta', diaPuro('2026-12-31') === '2026-12-31')
check('una cadena con hora se recorta al día', diaPuro('2026-12-31T23:00:00Z') === '2026-12-31')
/* Prisma devuelve una columna DATE como Date a medianoche UTC. Esto es
 * exactamente lo que `.getDate()` leía mal: con TZ=America/Bogota daba 30. */
check('un DATE de Prisma (medianoche UTC) se lee como su día, no como el anterior',
  diaPuro(new Date('2026-12-31T00:00:00Z')) === '2026-12-31',
  `(dio ${diaPuro(new Date('2026-12-31T00:00:00Z'))})`)
check('el año de un día puro sale de la cadena, sin Date de por medio',
  anioDelDia('2027-01-01') === 2027)
check('…y el de un DATE de Prisma también', anioDelDia(new Date('2027-01-01T00:00:00Z')) === 2027)
check('vacío es null, no hoy', diaPuro(null) === null && diaPuro('') === null && diaPuro(undefined) === null)

console.log('\n══ MESES DE CALENDARIO, QUE NO SON 365 DÍAS ══')
/* «Doce meses» es la misma fecha del mes correspondiente, no una duración. */
check('doce meses antes del 15 de octubre de 2026 es el 15 de octubre de 2025',
  diaEnColombia(mesesAntesEnColombia(12, new Date('2026-10-15T10:00:00-05:00'))) === '2025-10-15',
  `(dio ${diaEnColombia(mesesAntesEnColombia(12, new Date('2026-10-15T10:00:00-05:00')))})`)
check('un mes antes del 31 de marzo es el 28 de febrero, no el 3 de marzo',
  diaEnColombia(mesesAntesEnColombia(1, new Date('2026-03-31T10:00:00-05:00'))) === '2026-02-28',
  `(dio ${diaEnColombia(mesesAntesEnColombia(1, new Date('2026-03-31T10:00:00-05:00')))})`)
check('doce meses antes del 29 de febrero de 2028 es el 28 de febrero de 2027',
  diaEnColombia(mesesAntesEnColombia(12, new Date('2028-02-29T10:00:00-05:00'))) === '2027-02-28',
  `(dio ${diaEnColombia(mesesAntesEnColombia(12, new Date('2028-02-29T10:00:00-05:00')))})`)
check('el corte cruza el año sin perderse',
  diaEnColombia(mesesAntesEnColombia(12, new Date('2026-01-10T10:00:00-05:00'))) === '2025-01-10')
check('y vale para cualquier número de meses',
  diaEnColombia(mesesAntesEnColombia(18, new Date('2026-10-15T10:00:00-05:00'))) === '2025-04-15')

console.log('\n══ LOS LÍMITES DE UN DÍA, PARA COMPARAR CONTRA INSTANTES ══')
const l = limitesDelDia('2026-12-31')
check('el día empieza a medianoche de Colombia', l.desde.toISOString() === '2026-12-31T05:00:00.000Z',
  `(dio ${l.desde.toISOString()})`)
check('y acaba en la medianoche del siguiente, excluida',
  l.hasta.toISOString() === '2027-01-01T05:00:00.000Z', `(dio ${l.hasta.toISOString()})`)
check('un gasto de las 20:00 de Colombia del 31 cae DENTRO del 31',
  (() => { const t = new Date('2026-12-31T20:00:00-05:00'); return t >= l.desde && t < l.hasta })())
check('uno de las 23:59 del 30 NO cae en el 31',
  (() => { const t = new Date('2026-12-30T23:59:00-05:00'); return !(t >= l.desde && t < l.hasta) })())
check('el día siguiente cruza el fin de mes', siguienteDia('2026-01-31') === '2026-02-01')
check('…y el fin de año', siguienteDia('2026-12-31') === '2027-01-01')
check('…y el 28 de febrero de un año bisiesto', siguienteDia('2028-02-28') === '2028-02-29')

console.log('\n══ EL BORDE DE UNA VIGENCIA: EL ÚLTIMO DÍA CUENTA ENTERO ══')
/*
 * `mac_knowledge.vigente_hasta` es un día puro en columna DATE, y su filtro lo
 * compara contra la medianoche UTC del día de hoy en Colombia. Antes comparaba
 * contra un INSTANTE, y al promover Postgres el `date` a su medianoche una ficha
 * vigente «hasta el 15» dejaba de usarse desde las 19:00 del 14 en Colombia:
 * perdía casi dos días, no cinco horas.
 *
 * Esto fija la semántica del borde, que es la que el filtro de SQL reproduce.
 * No prueba el SQL —eso lo hace `probar-fechas-base.mjs` leyendo de la base—:
 * prueba que el último día de vigencia cuenta entero.
 */
const limite = dia => new Date(`${dia}T00:00:00Z`)
check('una vigencia «hasta el 15» sigue vigente el 15',
  limite('2026-10-15') >= limite('2026-10-15'))
check('…y el 16 ya no',
  !(limite('2026-10-15') >= limite('2026-10-16')))
check('…y el 14, por supuesto, sí',
  limite('2026-10-15') >= limite('2026-10-14'))
check('las 19:30 del 15 en Colombia dan la medianoche UTC del 15, no del 16',
  limite(diaEnColombia(new Date('2026-10-15T19:30:00-05:00'))).toISOString() === '2026-10-15T00:00:00.000Z',
  `(dio ${limite(diaEnColombia(new Date('2026-10-15T19:30:00-05:00'))).toISOString()})`)

console.log(`\n${fallos.length === 0 ? '✓ TODO EN VERDE' : '✗ CON FALLOS'} — ${ok} verificaciones, ${fallos.length} fallos`)
if (fallos.length) process.exit(1)
