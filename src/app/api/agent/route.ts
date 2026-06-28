import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runMac } from '@/lib/agent/runMac'

// ─── Rate limiter (in-memory, per sessionId) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(sessionId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

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

  // 2. Rate limit
  if (!checkRateLimit(sessionId)) {
    return NextResponse.json(
      { error: 'Demasiados mensajes. Por favor espera un momento.' },
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
