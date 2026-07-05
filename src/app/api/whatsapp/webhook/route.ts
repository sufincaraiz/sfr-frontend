import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { runMac } from '@/lib/agent/runMac'

// Runtime de Node: necesitamos `crypto` (firma) y la lógica de Mac (Anthropic + Prisma).
// Forzamos dinámico: nunca cachear.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH_VERSION = 'v21.0'

// Solo procesamos texto con el modelo; el resto de medios recibe un aviso fijo.
const MEDIA_REPLY = '¡Hola! Por ahora solo puedo leer mensajes de texto 📝 ¿Me escribes tu consulta?'
const RATE_REPLY  = 'Has enviado varios mensajes muy seguidos. Dame un momentito y con gusto retomamos. 🙏'

// Tope de longitud del mensaje que se envía al modelo (protege tokens).
const MAX_MSG_LEN = 1500

// ── Rate limit por número de WhatsApp (en memoria, por instancia) ─────────────
// Protege el gasto de tokens ante ráfagas/spam. Nota: en serverless la memoria es
// por instancia y efímera; frena ráfagas en una instancia caliente, no es global.
const RATE_LIMIT = 20                       // mensajes...
const RATE_WINDOW_MS = 60 * 60 * 1000       // ...por hora, por número
const rateMap = new Map<string, { count: number; resetAt: number; notified: boolean }>()

function revisarLimite(numero: string): 'ok' | 'notify' | 'silence' {
  const now = Date.now()
  let e = rateMap.get(numero)
  if (!e || now > e.resetAt) {
    e = { count: 0, resetAt: now + RATE_WINDOW_MS, notified: false }
    rateMap.set(numero, e)
  }
  e.count++
  if (e.count <= RATE_LIMIT) return 'ok'
  if (!e.notified) { e.notified = true; return 'notify' } // avisamos una sola vez
  return 'silence'                                         // luego, silencio hasta que expire la ventana
}

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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  })

  if (!res.ok) {
    console.error(`[WhatsApp] Envío fallido (${res.status}):`, await res.text().catch(() => ''))
  }
}

// Acuse de lectura (doble check azul). Se aplica igual a texto y a medios.
async function marcarComoLeido(messageId: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneId || !token) return
  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
    })
  } catch (err) {
    console.error('[WhatsApp] No se pudo marcar como leído:', err)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Mensajes entrantes: firma → (rate limit) → Mac/medios → responde.
// Responde 200 SIEMPRE y lo antes posible; el trabajo pesado va en after().
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // (A) Validar firma. Si es inválida: 200 igual (sin reintentos de Meta) pero NO procesamos.
  if (!firmaValida(rawBody, req.headers.get('x-hub-signature-256'))) {
    console.warn('[WhatsApp] Firma inválida o ausente — evento ignorado.')
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  }

  // Extraer remitente, tipo, id y (si aplica) texto.
  let from: string | undefined
  let type: string | undefined
  let messageId: string | undefined
  let text: string | undefined
  let profileName = '(sin nombre)'
  try {
    const payload = JSON.parse(rawBody)
    const value = payload?.entry?.[0]?.changes?.[0]?.value
    const message = value?.messages?.[0]
    if (message) {
      from = message.from as string // wa_id (número) del remitente
      type = message.type as string
      messageId = message.id as string
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

  // Sin mensaje procesable (p. ej. recibos de entrega/lectura en `statuses`) → 200 y fin.
  if (!from || !messageId) {
    console.log('[WhatsApp] Evento sin mensaje (status u otro) — ignorado.')
    return new NextResponse('EVENT_RECEIVED', { status: 200 })
  }

  const numero = from
  const id = messageId
  const nombre = profileName
  const tipo = type
  const rate = revisarLimite(numero)

  // (B) Procesar DESPUÉS del 200 (no bloquea el ACK a Meta).
  after(async () => {
    try {
      await marcarComoLeido(id) // acuse de lectura, igual para texto y medios

      // Rate limit superado: avisamos una vez y luego silenciamos hasta que expire la ventana.
      if (rate === 'silence') return
      if (rate === 'notify') {
        console.warn(`[WhatsApp] Rate limit superado por ${numero} — aviso enviado.`)
        await enviarTextoWhatsApp(numero, RATE_REPLY)
        return
      }

      if (text && text.trim()) {
        // TEXTO → Mac (misma lógica/prompt que la web). Se acota la longitud (tokens).
        const mensaje = text.slice(0, MAX_MSG_LEN)
        console.log(`[WhatsApp] Mensaje de ${nombre} (${numero}): ${mensaje}`)
        const { reply } = await runMac({ sessionId: numero, message: mensaje, channel: 'WHATSAPP' })
        await enviarTextoWhatsApp(numero, reply)
        console.log(`[WhatsApp] Respondido a ${nombre} (${numero}).`)
      } else {
        // MEDIOS (audio, image, video, document, sticker, location, contacts…) → aviso fijo.
        console.log(`[WhatsApp] Medio no soportado (${tipo}) de ${nombre} (${numero}) — aviso enviado.`)
        await enviarTextoWhatsApp(numero, MEDIA_REPLY)
      }
    } catch (err) {
      // Si Mac o el envío fallan, lo registramos; el webhook ya respondió 200.
      console.error('[WhatsApp] Error procesando/respondiendo el mensaje:', err)
    }
  })

  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}
