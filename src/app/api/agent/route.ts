import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runMac } from '@/lib/agent/runMac'
import { checkRateLimit } from '@/lib/agent/ratelimit'

// La consulta al modelo experto (Opus) puede tardar hasta ~30 s, más los turnos de
// Haiku. Ampliamos el límite de la función para que no se corte a mitad de turno.
export const maxDuration = 60

// ─── Input schema ─────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  message:   z.string().min(1).max(4000),
  channel:   z.enum(['WEB', 'WHATSAPP', 'TELEGRAM', 'APP']).default('WEB'),
})

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse and validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido.' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de entrada inválidos.' }, { status: 400 })
  }

  const { sessionId, message, channel } = parsed.data

  // 2. Rate limit distribuido (Upstash Redis) — por IP y por sesión. Falla cerrado.
  //    IP desde x-forwarded-for (primer valor); en Next.js 15 NextRequest.ip ya no
  //    existe. Sin header → "unknown" (no se desactiva el límite).
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff?.split(',')[0]?.trim() || 'unknown'
  const { ok } = await checkRateLimit(ip, sessionId)
  if (!ok) {
    // Misma forma que una respuesta normal ({ reply, ... }) para que el widget lo
    // renderice como un mensaje de Mac (el widget lee data.reply, no data.error).
    return NextResponse.json(
      { reply: 'Estás enviando mensajes muy rápido. Espera un momento y seguimos con calma. 🏡', properties: [] },
      { status: 429 }
    )
  }

  // 3. Procesar con la lógica única de Mac (compartida con otros canales)
  try {
    const result = await runMac({ sessionId, message, channel })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[Mac] error:', err)
    return NextResponse.json(
      { error: 'El asistente no está disponible en este momento. Por favor intenta más tarde.' },
      { status: 503 }
    )
  }
}
