// Envío de plantillas de WhatsApp (Cloud API de Meta). Reutiliza el mismo cliente y
// credenciales que enviarTextoWhatsApp del webhook (misma URL, versión de API,
// WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN).
//
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ REESCRITO EL 2026-10-23. Lo que había antes tenía tres `return` que salían
// sin dejar rastro, y por eso se pudieron perder avisos durante meses sin que
// nadie pudiera contarlos. El cuerpo literal que devuelve Meta se imprimía con
// `console.warn` y se iba con el log: cuando se fue a buscar para los tres
// leads del agente Mac, ya no existía.
//
// Ahora: `enviarPlantillaWhatsApp` **siempre devuelve un resultado** —nunca
// `void`, nunca una excepción— y `avisarLead` **siempre escribe una fila**.
// La decisión de si se puede mandar vive en `aviso-lead.ts`, que es un módulo
// hoja con su propio arnés, para que la regla se pueda probar sin red ni base.
//
// El pensamiento completo, con el caso que lo motivó, está en `aviso-lead.ts`.

import { prisma } from '@/lib/prisma'
import {
  decidirAviso,
  clasificarRespuesta,
  type ResultadoAviso,
} from '@/lib/aviso-lead'

const GRAPH_VERSION = 'v21.0'

/**
 * Deja el resumen listo para usarse como parámetro de plantilla de WhatsApp:
 * - Quita el markdown que antepone Haiku ("**RESUMEN PARA EL ASESOR:**") y cualquier
 *   negrita/encabezado.
 * - Colapsa saltos de línea, tabs y espacios múltiples a UN solo espacio: Meta rechaza
 *   parámetros de plantilla con saltos de línea, tabs o 4+ espacios seguidos, así que el
 *   parámetro debe quedar en una sola línea continua.
 * - Recorta a ~600 caracteres (los parámetros de plantilla tienen límite).
 */
export function limpiarResumenParaPlantilla(resumen: string): string {
  let t = (resumen ?? '')
    .replace(/\*\*/g, '')                                        // negritas markdown
    .replace(/^#{1,6}\s*/gm, '')                                 // encabezados #
    .replace(/^\s*resumen\s+para\s+el\s+asesor\s*:?\s*/i, '')    // encabezado conocido de Haiku
    .replace(/\s+/g, ' ')                                        // una sola línea continua
    .trim()
  if (t.length > 600) t = t.slice(0, 599).trimEnd() + '…'
  return t
}

/** Lo que se sabe de un intento. Siempre hay uno de éstos; nunca `void`. */
export interface IntentoDeAviso {
  resultado: ResultadoAviso
  destino: string | null
  http_status: number | null
  /** El cuerpo literal de Meta, o el mensaje del error de red. Sin interpretar. */
  error: string | null
}

/**
 * Manda la plantilla "nuevo_lead_sfr" (categoría Utility, idioma es_CO) con 3
 * variables de body en orden: {{1}} nombre, {{2}} teléfono, {{3}} resumen.
 *
 * NO lanza nunca y NO devuelve `void`: devuelve qué pasó. El llamador decide
 * qué hacer con eso, pero no puede ignorarlo sin que se vea.
 */
export async function enviarPlantillaWhatsApp(
  nombre: string,
  telefono: string,
  resumen: string,
): Promise<IntentoDeAviso> {
  const decision = decidirAviso({
    to: process.env.ALERT_WHATSAPP_TO,
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_ACCESS_TOKEN,
  }, resumen)

  if (!decision.manda) {
    // Antes esto era `if (!to) return`, sin una sola línea en ningún sitio.
    console.warn(`[WhatsApp alerta] ${decision.motivo}`)
    return {
      resultado: decision.resultado,
      destino: decision.destino,
      http_status: null,
      error: decision.motivo,
    }
  }

  const to = decision.destino
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? '').trim()
  const token = (process.env.WHATSAPP_ACCESS_TOKEN ?? '').trim()

  // Los parámetros de plantilla no admiten saltos de línea; se normalizan a una línea.
  const nombreParam   = ((nombre || 'Lead nuevo').replace(/\s+/g, ' ').trim() || 'Lead nuevo').slice(0, 300)
  const telefonoParam = (telefono || 'sin número').replace(/\s+/g, ' ').trim() || 'sin número'
  const resumenParam  = limpiarResumenParaPlantilla(resumen) || 'Lead nuevo captado.'

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: 'nuevo_lead_sfr',
          language: { code: 'es_CO' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: nombreParam },
                { type: 'text', text: telefonoParam },
                { type: 'text', text: resumenParam },
              ],
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })

    // El cuerpo se lee SIEMPRE, también en el caso bueno: es lo único que
    // distingue «plantilla sin aprobar» de «token caducado» cuando falla, y en
    // el caso bueno trae el id del mensaje.
    const cuerpo = await res.text().catch(() => '(sin cuerpo)')
    const resultado = clasificarRespuesta(res.status)

    if (resultado !== 'ACEPTADO_POR_META') {
      console.warn(`[WhatsApp alerta] Envío fallido (${res.status}): ${cuerpo}`)
    }
    return {
      resultado,
      destino: to,
      http_status: res.status,
      error: resultado === 'ACEPTADO_POR_META' ? null : cuerpo.slice(0, 4000),
    }
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.warn('[WhatsApp alerta] Error enviando la alerta:', msg)
    return {
      resultado: clasificarRespuesta(null),
      destino: to,
      http_status: null,
      error: msg.slice(0, 4000),
    }
  }
}

/**
 * AVISA DE UN LEAD Y DEJA LA FILA, PASE LO QUE PASE.
 *
 * Es la única puerta por la que debe pasar un aviso de lead, porque es la que
 * garantiza la constancia. Si el aviso no sale, la fila dice por qué; si sale,
 * la fila dice que Meta lo aceptó —que no es lo mismo que que Leonel lo leyera,
 * y por eso el resultado se llama `ACEPTADO_POR_META`—.
 *
 * NO lanza: un fallo guardando la constancia no puede tumbar la captura del
 * lead, que es el dato que de verdad importa. Pero ese fallo sí se registra en
 * el log del servidor, porque es la única capa que queda por debajo.
 */
export async function avisarLead(
  leadId: string,
  nombre: string,
  telefono: string,
  resumen: string,
): Promise<IntentoDeAviso> {
  const intento = await enviarPlantillaWhatsApp(nombre, telefono, resumen)
  try {
    await prisma.avisoLead.create({
      data: {
        lead_id: leadId,
        canal: 'whatsapp',
        destino: intento.destino,
        resultado: intento.resultado,
        http_status: intento.http_status,
        error: intento.error,
      },
    })
  } catch (err) {
    console.error(
      `[WhatsApp alerta] NO SE PUDO GUARDAR LA CONSTANCIA del aviso del lead ${leadId} ` +
      `(resultado ${intento.resultado}):`,
      err instanceof Error ? err.message : err,
    )
  }
  return intento
}

/**
 * Compatibilidad para los avisos que NO son de un lead —los dos crons y la
 * salud de Redis—, que no tienen `leadId` al que colgar la constancia.
 *
 * ⚠ Esos tres caminos siguen sin constancia en base, y es una deuda declarada,
 * no un olvido: su destinatario y su contenido no son un lead. Está anotada en
 * el traspaso. Lo que ya NO hacen es salir en silencio.
 */
export async function enviarAlertaLeadWhatsApp(
  nombre: string,
  telefono: string,
  resumen: string,
): Promise<IntentoDeAviso> {
  return enviarPlantillaWhatsApp(nombre, telefono, resumen)
}
