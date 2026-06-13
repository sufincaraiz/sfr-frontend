import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ─── Rate limit (en memoria, por IP) ──────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ─── Validación ────────────────────────────────────────────────────────────────

const LeadSchema = z.object({
  nombre:   z.string().trim().min(2, 'Nombre requerido').max(120),
  telefono: z.string().trim().min(7, 'Teléfono inválido').max(30),
  mensaje:  z.string().trim().max(2000).optional().default(''),
  email:    z.string().trim().email().max(160).optional().or(z.literal('')).default(''),
  // distingue el origen del lead; ej. "vender-finca" para "Vende tu finca"
  channel:  z.string().trim().max(40).optional().default('web'),
})

// ─── POST /api/leads — captura pública de leads (tabla Lead) ──────────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const parsed = LeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa los datos del formulario.' }, { status: 400 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados envíos. Espera un momento e intenta de nuevo.' },
      { status: 429 },
    )
  }

  const { nombre, telefono, mensaje, email, channel } = parsed.data

  try {
    await prisma.lead.create({
      data: {
        name:    nombre,
        phone:   telefono,
        email:   email ?? '',
        channel,                  // "vender-finca" para leads de venta
        message: mensaje || null,
        status:  'new',
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/leads] error al crear lead:', err)
    return NextResponse.json(
      { error: 'No pudimos guardar tu solicitud. Intenta de nuevo en un momento.' },
      { status: 500 },
    )
  }
}
