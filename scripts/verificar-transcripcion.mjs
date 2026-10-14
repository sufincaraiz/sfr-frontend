#!/usr/bin/env node
/**
 * ¿EL MÓDULO GENERADO SIGUE CUADRANDO CON EL DOCUMENTO?
 * ====================================================
 *
 * `transcripcion.generada.ts` es una copia derivada del bloque de cotejo de
 * PARAMETROS-NOTARIALES-VERIFICADOS.md. Una copia que se queda vieja es peor
 * que no tenerla: el panel ordenaría la pantalla y cotejaría contra una
 * transcripción que ya no es la que alguien leyó del PDF, y lo haría en
 * silencio.
 *
 * Esto compara la huella del bloque con la que el módulo dice tener, y rompe el
 * build si no coinciden. Corre antes de `next build`.
 */
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const DOC = 'PARAMETROS-NOTARIALES-VERIFICADOS.md'
const GENERADO = 'src/lib/notariales/transcripcion.generada.ts'

const texto = readFileSync(DOC, 'utf8')
const desde = texto.indexOf('<!-- COTEJO:INICIO -->')
const hasta = texto.indexOf('<!-- COTEJO:FIN -->')
if (desde < 0 || hasta < 0) {
  console.log(`\n  ✗ ${DOC} no tiene las marcas del bloque de cotejo.\n`)
  process.exit(1)
}
const huella = createHash('sha256').update(texto.slice(desde, hasta)).digest('hex')

let generado
try {
  generado = readFileSync(GENERADO, 'utf8')
} catch {
  console.log(`\n  ✗ falta ${GENERADO}.`)
  console.log('    Genéralo:  node scripts/generar-transcripcion.mjs\n')
  process.exit(1)
}

const m = generado.match(/HUELLA_DEL_BLOQUE = '([0-9a-f]{64})'/)
if (!m) {
  console.log(`\n  ✗ ${GENERADO} no declara su huella. ¿Se editó a mano?\n`)
  process.exit(1)
}

console.log('\n══ TRANSCRIPCIÓN GENERADA ════════════════════════════════════')
if (m[1] !== huella) {
  console.log('  ✗ el módulo generado NO cuadra con el bloque del documento.')
  console.log(`     documento: ${huella.slice(0, 16)}…`)
  console.log(`     generado:  ${m[1].slice(0, 16)}…`)
  console.log('     Alguien cambió la transcripción y no regeneró el módulo.')
  console.log('     Genéralo y commitéalo:  node scripts/generar-transcripcion.mjs\n')
  process.exit(1)
}
console.log(`  ✓ cuadra con ${DOC} (${huella.slice(0, 12)}…)\n`)
