import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { leerBloqueCotejo, type FilaTranscrita } from './cotejo'
import { clasificarError } from './errores'

/**
 * Lo compartido por las rutas del panel.
 *
 * Vive aquí y no en un `route.ts` porque una ruta de API solo puede exportar
 * métodos HTTP: cualquier otro export rompe el build de Next, y lo hace con un
 * error que habla de `checkFields` y no de lo que pasa.
 */

/**
 * Desde `process.cwd()` y no relativo: en una función serverless el directorio
 * de trabajo no es la raíz del repositorio, y una ruta relativa resuelve donde
 * no está el archivo. Que el archivo VIAJE con la función es cosa de
 * `outputFileTracingIncludes` en next.config.ts, vigilado por
 * `scripts/verificar-trazas.mjs`.
 */
const DOCUMENTO = join(process.cwd(), 'PARAMETROS-NOTARIALES-VERIFICADOS.md')

/**
 * El bloque de cotejo, leído del documento del repositorio.
 *
 * ⚠ Se lee del ARCHIVO, no de la base. Es la otra lectura del PDF, y tiene que
 * venir de un sitio que el panel no escriba: si viviera en la base, el panel
 * podría escribir las dos y el cotejo compararía una lectura consigo misma.
 */
export async function transcripcion(): Promise<FilaTranscrita[]> {
  return leerBloqueCotejo(await readFile(DOCUMENTO, 'utf8'))
}

/**
 * El envoltorio HTTP. La clasificación vive en `errores.ts`, como función pura,
 * para poder probarla en el arnés: una clasificación de errores que nadie
 * prueba acaba teniendo todas las ramas menos la que hace falta.
 */
export function respuestaDeError(e: unknown, donde: string) {
  // Siempre al log, clasificado o no: el detalle técnico no va al usuario pero
  // tiene que quedar en alguna parte.
  console.error(`[notariales] ${donde}`, e)
  const { error, causa, status } = clasificarError(e, donde)
  return NextResponse.json({ error, causa }, { status })
}
