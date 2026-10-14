/**
 * LA HUELLA DEL BLOQUE DE COTEJO, EN UN SOLO SITIO
 * ================================================
 *
 * `generar-transcripcion.mjs` escribe la huella en el módulo y
 * `verificar-transcripcion.mjs` la vuelve a calcular para ver si quedó vieja.
 * Las dos tienen que calcularla IGUAL o la guarda falla sin que nada esté mal,
 * y por eso no puede estar escrita dos veces: está aquí.
 *
 * ⚠ SE NORMALIZAN LOS FINALES DE LÍNEA, Y NO ES COSMÉTICO.
 *
 * El 2026-10-14 esta guarda rompió el despliegue de un commit que en la máquina
 * del desarrollo daba verde. Las dos cosas eran ciertas: `.gitattributes` guarda
 * el documento con LF, la copia en Windows lo tenía con CRLF —los scripts que
 * lo parchearon escribían con `io.open(..., 'w')`, que traduce— y el módulo
 * viajó con la huella del CRLF. Mismo commit, bytes distintos en cada
 * superficie: en disco `b13440ff…`, como git lo guarda `39b59fd7…`.
 *
 * La lección no es «cuidado con los finales de línea». Es que **la huella era de
 * la superficie y tenía que ser del contenido**. Un hash que cambia según quién
 * hizo el checkout no identifica un documento: identifica una copia. Mientras
 * eso fuera así, la guarda iba a seguir siendo un sí/no distinto en cada
 * máquina, y ninguna de las dos respuestas servía de nada.
 *
 * Lo mismo NO aplica a `evidencia.ts`: ahí se hashean los bytes de un PDF que
 * llega por la red, y normalizar bytes binarios los corrompería. La distinción
 * es que esto es un documento de texto versionado y aquello es un archivo.
 */
import { createHash } from 'node:crypto'
import { INICIO, FIN } from './cotejo.ts'

/** Error con nombre propio: faltar las marcas no es lo mismo que no cuadrar. */
export class SinMarcasDelBloque extends Error {
  constructor() {
    super(`el documento no tiene las marcas ${INICIO} … ${FIN}.`)
    this.name = 'SinMarcasDelBloque'
  }
}

/**
 * SHA-256 del bloque de cotejo, independiente de los finales de línea.
 *
 * Es del BLOQUE y no del documento a propósito: la prosa de alrededor puede
 * cambiar sin obligar a regenerar nada.
 */
export function huellaDelBloque(documento: string): string {
  const texto = documento.replace(/\r\n/g, '\n')
  const desde = texto.indexOf(INICIO)
  const hasta = texto.indexOf(FIN)
  if (desde < 0 || hasta < 0) throw new SinMarcasDelBloque()
  return createHash('sha256').update(texto.slice(desde, hasta)).digest('hex')
}
