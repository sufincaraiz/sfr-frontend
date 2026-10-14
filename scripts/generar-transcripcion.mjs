#!/usr/bin/env node
/**
 * GENERA EL BLOQUE DE COTEJO COMO MÓDULO, A PARTIR DEL DOCUMENTO
 * ==============================================================
 *
 * El panel necesita la transcripción del PDF para ordenar la pantalla y para
 * cotejar. La leía del `.md` en runtime, y eso causó el 500 del 2026-10-14: una
 * función serverless no se despliega con el repositorio.
 *
 * Se arregló haciendo que el archivo viajara con la función, lo cual funciona y
 * sigue siendo un `readFile` en el camino caliente, dependiente de que alguien
 * mantenga la configuración de trazas. Esto lo quita de raíz: el bloque se
 * convierte en un módulo en tiempo de generación y en runtime no se toca el
 * disco.
 *
 * ⚠ LO QUE NO CAMBIA, y es el motivo de que el bloque exista: la transcripción
 * sigue siendo UNA SOLA fuente, el `.md`, y el panel no la escribe. Este archivo
 * generado es una copia derivada, nunca se edita a mano, y `verificar-
 * transcripcion.mjs` rompe el build si se queda viejo respecto al documento.
 *
 *   node scripts/generar-transcripcion.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { leerBloqueCotejo } from '../src/lib/notariales/cotejo.ts'
import { huellaDelBloque } from '../src/lib/notariales/huella.ts'

const DOC = 'PARAMETROS-NOTARIALES-VERIFICADOS.md'
const DESTINO = 'src/lib/notariales/transcripcion.generada.ts'

const texto = readFileSync(DOC, 'utf8')
const filas = leerBloqueCotejo(texto)

const huella = huellaDelBloque(texto)

const salida = `/**
 * ⚠ ARCHIVO GENERADO. NO SE EDITA A MANO.
 *
 * Sale de ${DOC} con:
 *   node scripts/generar-transcripcion.mjs
 *
 * Existe para que el panel NO lea el documento del disco en runtime: eso causó
 * un 500 en producción el 2026-10-14, porque una función serverless no se
 * despliega con el repositorio. La fuente sigue siendo UNA: el documento. Si
 * este archivo se queda viejo, \`scripts/verificar-transcripcion.mjs\` rompe el
 * build.
 */
import type { FilaTranscrita } from './cotejo'

/** SHA-256 del bloque de cotejo del documento del que salió esto. */
export const HUELLA_DEL_BLOQUE = '${huella}'

export const TRANSCRIPCION: readonly FilaTranscrita[] = ${JSON.stringify(filas, null, 2)
  .replace(/"([a-z_]+)":/g, '$1:')
  .replace(/"/g, "'")} as const
`

writeFileSync(DESTINO, salida, 'utf8')
console.log(`\n  ✓ ${DESTINO}`)
console.log(`    ${filas.length} cifras transcritas · huella ${huella.slice(0, 12)}…\n`)
