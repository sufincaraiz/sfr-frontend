import 'server-only'
import { NextResponse } from 'next/server'
import { clasificarError } from './errores'
import { TRANSCRIPCION } from './transcripcion.generada'
import type { FilaTranscrita } from './cotejo'

/**
 * Lo compartido por las rutas del panel.
 *
 * Vive aqui y no en un `route.ts` porque una ruta de API solo puede exportar
 * metodos HTTP: cualquier otro export rompe el build de Next, y lo hace con un
 * error que habla de `checkFields` y no de lo que pasa.
 */

/**
 * El bloque de cotejo: la otra lectura del PDF.
 *
 * SIN TOCAR EL DISCO. Antes se leia el `.md` con `readFile` y eso produjo un
 * 500 en produccion el 2026-10-14: una funcion serverless no se despliega con
 * el repositorio. Ahora viene de `transcripcion.generada.ts`, un modulo
 * derivado del documento en tiempo de generacion.
 *
 * Lo que NO cambia es lo que hace valer el cotejo: la fuente sigue siendo UNA
 * -el documento- y el panel no la escribe. Si el modulo generado se queda viejo
 * respecto al documento, `scripts/verificar-transcripcion.mjs` rompe el build.
 */
export function transcripcion(): FilaTranscrita[] {
  return [...TRANSCRIPCION]
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
