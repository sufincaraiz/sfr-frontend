import { NextRequest, NextResponse } from 'next/server'
// import crypto from 'crypto' // (paso siguiente) validar la firma X-Hub-Signature-256

// Necesitamos el runtime de Node: en el siguiente paso usaremos `crypto` (firma)
// y la lógica de Mac (Anthropic + Prisma). Forzamos dinámico: nunca cachear.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// GET — Verificación del webhook (handshake de Meta)
// Meta llama una vez con ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// Si el token coincide con WHATSAPP_VERIFY_TOKEN, devolvemos el challenge en texto
// plano (status 200). Si no, 403.
// ─────────────────────────────────────────────────────────────────────────────
export function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Meta espera el challenge tal cual, como texto plano.
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Mensajes entrantes
// Por ahora SOLO registra en consola de quién viene y el texto, y responde 200
// de inmediato (Meta reintenta el envío si no recibe 200 a tiempo).
// Todavía NO conecta con Mac ni responde al usuario (eso es el siguiente paso).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Leemos el cuerpo CRUDO: la validación de firma del paso siguiente se calcula
  // sobre los bytes exactos recibidos, no sobre el JSON re-serializado.
  const rawBody = await req.text()

  // === (PASO SIGUIENTE) Validación de la firma de Meta ========================
  // La firma se calcula con el App Secret de la app de Meta (variable nueva,
  // p. ej. WHATSAPP_APP_SECRET) sobre `rawBody`. Dejarlo listo:
  //
  // const signature = req.headers.get('x-hub-signature-256') ?? ''       // 'sha256=<hex>'
  // const expected =
  //   'sha256=' +
  //   crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET ?? '')
  //     .update(rawBody)
  //     .digest('hex')
  // const valid =
  //   signature.length === expected.length &&
  //   crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  // if (!valid) return new NextResponse('Invalid signature', { status: 401 })
  // ===========================================================================

  try {
    const payload = JSON.parse(rawBody)

    // Estructura de la WhatsApp Cloud API:
    //   entry[].changes[].value.{ messages[], contacts[], statuses[] }
    const value = payload?.entry?.[0]?.changes?.[0]?.value
    const message = value?.messages?.[0]

    if (message) {
      const from = message.from as string // wa_id (número) del remitente
      const profileName = value?.contacts?.[0]?.profile?.name ?? '(sin nombre)'
      const text =
        message.text?.body ??
        message.button?.text ??
        message.interactive?.list_reply?.title ??
        message.interactive?.button_reply?.title ??
        `[${message.type ?? 'no-text'}]`

      console.log(`[WhatsApp] Mensaje de ${profileName} (${from}): ${text}`)
    } else if (value?.statuses?.length) {
      // Recibos de entrega/lectura — los ignoramos por ahora.
      console.log(`[WhatsApp] Status: ${value.statuses[0]?.status ?? 'desconocido'}`)
    } else {
      console.log('[WhatsApp] Evento recibido sin mensaje (ignorado).')
    }
  } catch (err) {
    // Nunca dejamos que un error bloquee el 200: Meta acumularía reintentos.
    console.error('[WhatsApp] Error procesando el payload:', err)
  }

  // SIEMPRE 200 rápido.
  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}
