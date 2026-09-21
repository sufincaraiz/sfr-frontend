/**
 * FORMATO DE LA RESPUESTA DEL CONTADOR — única definición
 * ========================================================
 *
 * El contador llena /interno/datos-contador en su teléfono y lo envía por
 * WhatsApp. El mensaje trae un resumen legible y un CÓDIGO que la pantalla de
 * parámetros importa, para no reteclear nada.
 *
 * El codificador existe UNA sola vez, como texto JavaScript (`CODIFICADOR_JS`):
 *   · la página del formulario lo incrusta tal cual en su <script>;
 *   · `scripts/probar-finanzas.mjs` lo ejecuta y comprueba ida y vuelta contra
 *     `decodificarRespuesta`.
 * Si el formulario y el panel tuvieran cada uno su versión, divergirían en
 * silencio y el import fallaría el día que el contador ya envió los datos.
 *
 * Módulo HOJA, sin imports: lo usan el navegador (panel), el servidor (página)
 * y Node (prueba). Lo importado NUNCA se da por bueno: entra al borrador SIN
 * REVISAR y cuenta como pendiente hasta que alguien lo confirme.
 */

export const PREFIJO_RESPUESTA = 'SFR-PARAMETROS-v1:'

/**
 * Codificador isomorfo (navegador y Node): JSON → UTF-8 → base64url.
 * Sin expresiones regulares a propósito, para no pelear con escapes dentro de
 * la plantilla de texto.
 */
export const CODIFICADOR_JS = `function codificarRespuesta(datos) {
  var bytes = new TextEncoder().encode(JSON.stringify(datos));
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  var b64 = btoa(bin).split('+').join('-').split('/').join('_');
  while (b64.charAt(b64.length - 1) === '=') b64 = b64.slice(0, -1);
  return '${PREFIJO_RESPUESTA}' + b64;
}`

export interface ConceptoRespuesta {
  label: string
  declarante: string
  no_declarante: string
  base_uvt: string
}

export interface RespuestaContador {
  v: 1
  anio: number
  por: string
  fecha: string
  uvt: string
  /** 'si' | 'no' | '' (sin responder) */
  responsable_iva: string
  tarifa_iva: string
  agente_reteiva: string
  tarifa_reteiva: string
  conceptos: ConceptoRespuesta[]
  /** La tarifa de ICA depende de la ACTIVIDAD: por eso municipio + CIIU. */
  ica: { municipio: string; ciiu: string; tarifa: string }[]
  /**
   * CIIU que aplica a cada línea de servicio. Lo confirma el contador: sin él
   * el ICA de ese ingreso no se calcula (no se asume la tarifa general).
   * Opcional en el código para no romper los formularios ya enviados.
   */
  servicios: { linea: string; ciiu: string }[]
}

export class ErrorFormatoRespuesta extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorFormatoRespuesta'
  }
}

const esTexto = (v: unknown): v is string => typeof v === 'string'

/**
 * Extrae y valida el código de un texto pegado (puede venir con todo el
 * mensaje de WhatsApp alrededor). Lanza con un mensaje claro si no sirve.
 */
export function decodificarRespuesta(texto: string): RespuestaContador {
  const i = texto.indexOf(PREFIJO_RESPUESTA)
  if (i < 0) throw new ErrorFormatoRespuesta('No se encontró el código del formulario en el texto pegado.')
  let b64 = ''
  for (const ch of texto.slice(i + PREFIJO_RESPUESTA.length)) {
    if (/[A-Za-z0-9_-]/.test(ch)) b64 += ch
    else break
  }
  if (!b64) throw new ErrorFormatoRespuesta('El código está vacío o cortado.')

  let datos: unknown
  try {
    const normal = b64.split('-').join('+').split('_').join('/') + '==='.slice((b64.length + 3) % 4)
    const bin = atob(normal)
    const bytes = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
    datos = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    throw new ErrorFormatoRespuesta('El código está dañado: pudo cortarse al copiarlo. Pide que lo reenvíen.')
  }

  const d = datos as Record<string, unknown>
  if (!d || d.v !== 1) throw new ErrorFormatoRespuesta('Versión de formulario desconocida.')
  if (!Number.isInteger(d.anio)) throw new ErrorFormatoRespuesta('El código no trae el año.')
  for (const k of ['por', 'fecha', 'uvt', 'responsable_iva', 'tarifa_iva', 'agente_reteiva', 'tarifa_reteiva']) {
    if (!esTexto(d[k])) throw new ErrorFormatoRespuesta(`El código no trae «${k}» con el formato esperado.`)
  }
  if (!Array.isArray(d.conceptos) || !Array.isArray(d.ica)) {
    throw new ErrorFormatoRespuesta('El código no trae las tablas de conceptos e ICA.')
  }
  const conceptos = (d.conceptos as Record<string, unknown>[]).map((c, n) => {
    if (!c || !esTexto(c.label) || !esTexto(c.declarante) || !esTexto(c.no_declarante) || !esTexto(c.base_uvt)) {
      throw new ErrorFormatoRespuesta(`El concepto ${n + 1} del código está incompleto.`)
    }
    return { label: c.label, declarante: c.declarante, no_declarante: c.no_declarante, base_uvt: c.base_uvt }
  })
  const ica = (d.ica as Record<string, unknown>[]).map((t, n) => {
    if (!t || !esTexto(t.municipio) || !esTexto(t.tarifa)) {
      throw new ErrorFormatoRespuesta(`La tarifa de ICA ${n + 1} del código está incompleta.`)
    }
    // CIIU en blanco en una TARIFA significa «tarifa general del municipio».
    // Es un valor válido; en un ingreso significaría lo contrario.
    return { municipio: t.municipio, ciiu: esTexto(t.ciiu) ? t.ciiu : '', tarifa: t.tarifa }
  })
  const servicios = Array.isArray(d.servicios)
    ? (d.servicios as Record<string, unknown>[]).map((sv, n) => {
        if (!sv || !esTexto(sv.linea) || !esTexto(sv.ciiu)) {
          throw new ErrorFormatoRespuesta(`La línea de servicio ${n + 1} del código está incompleta.`)
        }
        return { linea: sv.linea, ciiu: sv.ciiu }
      })
    : []

  return {
    v: 1, anio: d.anio as number,
    por: d.por as string, fecha: d.fecha as string, uvt: d.uvt as string,
    responsable_iva: d.responsable_iva as string, tarifa_iva: d.tarifa_iva as string,
    agente_reteiva: d.agente_reteiva as string, tarifa_reteiva: d.tarifa_reteiva as string,
    conceptos, ica, servicios,
  }
}
