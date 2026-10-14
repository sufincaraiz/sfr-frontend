import 'server-only'
import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { leerBloqueCotejo, type FilaTranscrita } from './cotejo'
import { ErrorEsquemaNotarial, RespaldoNoOficial } from './tipos'

/**
 * Lo compartido por las rutas del panel.
 *
 * Vive aquí y no en un `route.ts` porque una ruta de API solo puede exportar
 * métodos HTTP: cualquier otro export rompe el build de Next, y lo hace con un
 * error que habla de `checkFields` y no de lo que pasa.
 */

const DOCUMENTO = 'PARAMETROS-NOTARIALES-VERIFICADOS.md'

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
 * Los errores del módulo hablan con el usuario: dicen qué hay que resolver. Un
 * «error interno» obligaría a adivinar, y aquí adivinar significa volver a
 * abrir el PDF sin saber qué buscar.
 */
export function respuestaDeError(e: unknown, donde: string) {
  if (e instanceof ErrorEsquemaNotarial || e instanceof RespaldoNoOficial) {
    return NextResponse.json({ error: e.message, guarda: e.name }, { status: 409 })
  }
  console.error(`[notariales] ${donde}`, e)
  return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
}
