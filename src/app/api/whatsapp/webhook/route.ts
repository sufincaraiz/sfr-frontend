import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { runMac } from '@/lib/agent/runMac'

// Runtime de Node: necesitamos `crypto` (firma) y la lógica de Mac (Anthropic + Prisma).
// Forzamos dinámico: nunca cachear.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH_VERSION = 'v21.0'

// ─────────────────────────────────────────────────────────────────────────────
// GET — Verificación del webhook (handshake de Meta)
// ─────────────────────────────────────────────────────────────────────────────
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// ─────────────────────────────────────────────────────────────────────────────
// Seguridad — Firma X-Hub-Signature-256
// Meta firma el cuerpo CRUDO con HMAC-SHA256 usando el App Secret de la app.
// Comparación en tiempo constante para evitar timing attacks.
// ─────────────────────────────────────────────────────────────────────────────
function firmaValida(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    console.error('[WhatsApp] WHATSAPP_APP_SECRET no configurado — no se puede validar la firma.')
    return false
  }
  if (!signatureHeader) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// ─────────────────────────────────────────────────────────────────────────────
// Envío — WhatsApp Cloud API (Send messages)
// ─────────────────────────────────────────────────────────────────────────────
async function enviarTextoWhatsApp(to: string, body: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneId || !token) {
    console.error('[WhatsApp] Faltan WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN — no se envía.')
    return
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })

  if (!res.ok) {
    console.error(`[WhatsApp] Envío fallido (${res.status}):`, await res.text().catch(() => ''))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Mensajes entrantes: valida firma → Mac → responde por WhatsApp.
// Responde 200 SIEMPRE y lo antes posible; el trabajo pesado va en after().
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // (A) Validar firma. Si es inválida: 200 igual (sin reintentos de Meta) pero NO procesamos.
  if (!firmaValida(rawBody, req.headers.get('x-hub-signature-256'))) {
    console.warn('[WhatsApp] Firma inválida o ausente — evento ignorado.')
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  }

  // Extraer remitente + texto.
  let from: string | undefined
  let text: string | undefined
  let profileName = '(sin nombre)'
  try {
    const payload = JSON.parse(rawBody)
    const value = payload?.entry?.[0]?.changes?.[0]?.value
    const message = value?.messages?.[0]
    if (message) {
      from = message.from as string // wa_id (número) del remitente
      profileName = value?.contacts?.[0]?.profile?.name ?? '(sin nombre)'
      text =
        message.text?.body ??
        message.button?.text ??
        message.interactive?.list_reply?.title ??
        message.interactive?.button_reply?.title
    }
  } catch (err) {
    console.error('[WhatsApp] Error parseando el payload:', err)
  }

  // (B) Conectar con Mac y responder — DESPUÉS del 200 (no bloquea el ACK a Meta).
  if (from && text) {
    const numero = from
    const mensaje = text
    const nombre = profileName
    after(async () => {
      try {
        console.log(`[WhatsApp] Mensaje de ${nombre} (${numero}): ${mensaje}`)
        // Misma lógica/prompt que la web; sessionId = número de WhatsApp.
        const { reply } = await runMac({ sessionId: numero, message: mensaje, channel: 'WHATSAPP' })
        await enviarTextoWhatsApp(numero, reply)
        console.log(`[WhatsApp] Respondido a ${nombre} (${numero}).`)
      } catch (err) {
        // Si Mac o el envío fallan, lo registramos; el webhook ya respondió 200.
        console.error('[WhatsApp] Error procesando/respondiendo el mensaje:', err)
      }
    })
  } else {
    console.log('[WhatsApp] Evento sin mensaje de texto (status u otro) — ignorado.')
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}
