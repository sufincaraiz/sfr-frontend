// TEMPORAL — diagnóstico de la alerta de WhatsApp (plantilla nuevo_lead_sfr).
// Gated por ?key=. Envía la plantilla real a ALERT_WHATSAPP_TO y devuelve la respuesta
// EXACTA de Meta para poder diagnosticar. NO expone el valor de la variable (solo booleanos).
// SE ELIMINA tras la verificación.
import { NextRequest, NextResponse } from 'next/server'
import { limpiarResumenParaPlantilla } from '@/lib/whatsapp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH_VERSION = 'v21.0'
const KEY = 'sfr-alerta-QA-9f3a2c'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('key') !== KEY) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const to = process.env.ALERT_WHATSAPP_TO
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  const diag = {
    alertTargetConfigured: !!to,        // ← booleano, NO el número
    phoneIdConfigured: !!phoneId,
    accessTokenConfigured: !!token,
  }

  if (!to || !phoneId || !token) {
    return NextResponse.json({ diag, sent: false, note: 'Falta alguna variable; no se intenta enviar.' })
  }

  const resumen = limpiarResumenParaPlantilla(
    '**RESUMEN PARA EL ASESOR:**\n\nLead de prueba (QA) para verificar la plantilla. Busca finca en La Vega para inversión y descanso, presupuesto ~$1.500M. Solicita contacto directo.',
  )

  const body = {
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
            { type: 'text', text: 'QA Alerta Prueba' },
            { type: 'text', text: '+573000000099' },
            { type: 'text', text: resumen },
          ],
        },
      ],
    },
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const metaStatus = res.status
    const metaResponse = await res.json().catch(async () => ({ raw: await res.text().catch(() => '') }))
    return NextResponse.json({ diag, sent: metaStatus >= 200 && metaStatus < 300, metaStatus, metaResponse })
  } catch (err) {
    return NextResponse.json({ diag, sent: false, error: err instanceof Error ? err.message : String(err) })
  }
}
