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

/**
 * SHA-256 DE UNOS BYTES, SIN TOCARLOS. La huella de un PDF de evidencia.
 *
 * Vive aquí y no en `evidencia.ts` por una razón concreta: aquel módulo importa
 * `server-only`, y el arnés no puede entrar. Una función que **nadie puede
 * probar** es exactamente lo que no debe guardar una propiedad de la que
 * depende la evidencia de una norma.
 *
 * ⚠ AQUÍ NO SE NORMALIZA NADA, al contrario que en `huellaDelBloque`. Y la
 * diferencia no es un descuido:
 *
 *   · `huellaDelBloque` identifica un DOCUMENTO DE TEXTO VERSIONADO, cuya
 *     representación en disco cambia según quién hizo el checkout. Ahí los
 *     saltos de línea son superficie y hay que quitarlos.
 *   · esto identifica un ARCHIVO que alguien tiene en la mano. Cualquier
 *     transformación —normalizar, re-guardar, leer en modo texto— produciría
 *     una huella que solo nuestro código sabe reproducir, y eso no es
 *     evidencia: es un número.
 *
 * La prueba de que no se normaliza está en el arnés contra una constante
 * calculada con `sha256sum` y `certutil`, dos herramientas que no son nuestras.
 * El titular puede comprobar cualquier huella del panel con el PDF y uno de
 * esos dos comandos.
 */
export function hashDeBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}
