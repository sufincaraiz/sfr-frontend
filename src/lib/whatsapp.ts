// Envío de plantillas de WhatsApp (Cloud API de Meta). Reutiliza el mismo cliente y
// credenciales que enviarTextoWhatsApp del webhook (misma URL, versión de API,
// WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN).

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

/**
 * Alerta al asesor por WhatsApp cuando se capta un lead, usando la plantilla
 * "nuevo_lead_sfr" (categoría Utility, idioma es_CO) con 3 variables de body en orden:
 * {{1}} nombre, {{2}} teléfono, {{3}} resumen.
 *
 * FLAG: solo se intenta si ALERT_WHATSAPP_TO está definido (código en producción pero
 * dormido hasta que se configure la variable y Meta apruebe la plantilla).
 *
 * NO bloqueante: cualquier fallo (plantilla no aprobada, error de Meta, timeout) se
 * registra con console.warn incluyendo el BODY COMPLETO que devuelve Meta —clave para
 * diagnosticar problemas de aprobación/formato— y nunca rompe la captura del lead.
 */
export async function enviarAlertaLeadWhatsApp(nombre: string, telefono: string, resumen: string): Promise<void> {
  const to = process.env.ALERT_WHATSAPP_TO
  if (!to) return // dormido: sin destinatario configurado, ni se intenta

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneId || !token) {
    console.warn('[WhatsApp alerta] Faltan WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN — no se envía la alerta.')
    return
  }

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

    if (!res.ok) {
      // Body COMPLETO de Meta: imprescindible para diagnosticar aprobación/formato.
      const body = await res.text().catch(() => '(sin cuerpo)')
      console.warn(`[WhatsApp alerta] Envío fallido (${res.status}): ${body}`)
      return
    }
    console.log(`[WhatsApp alerta] Alerta de nuevo lead enviada a ${to}.`)
  } catch (err) {
    console.warn('[WhatsApp alerta] Error enviando la alerta:', err instanceof Error ? err.message : err)
  }
}
