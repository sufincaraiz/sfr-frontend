import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { checkVisitaRateLimit } from '@/lib/visitas-ratelimit'

// ─── Validación ──────────────────────────────────────────────────────────────
// Estricta a propósito: aquí entra un dato sensible (cédula) y el registro es
// la prueba del consentimiento, así que no se acepta nada a medias.

const VisitaSchema = z.object({
  nombresCompletos:   z.string().trim().min(3, 'Nombre requerido').max(120),
  // Solo dígitos. Las cédulas colombianas van de 6 a 10 dígitos; se deja margen.
  cedula:             z.string().trim().regex(/^\d{6,12}$/, 'Cédula inválida'),
  inmuebleReferencia: z.string().trim().min(2, 'Referencia requerida').max(200),
  correo:             z.string().trim().email('Correo inválido').max(160),
  // Se acepta el formato que escriba la gente (espacios, guiones, +57) y se
  // exige que queden entre 7 y 15 dígitos reales.
  celular:            z.string().trim().min(7).max(25)
                       .refine(v => /^\+?[\d\s-]+$/.test(v), 'Celular inválido')
                       .refine(v => {
                         const d = v.replace(/\D/g, '').length
                         return d >= 7 && d <= 15
                       }, 'Celular inválido'),
  municipioOrigen:    z.string().trim().min(2, 'Municipio requerido').max(80),
  // Las dos casillas son obligatorias: literal(true) rechaza false y ausencia.
  consentPolitica:       z.literal(true),
  consentControlIngreso: z.literal(true),
})

// ─── POST /api/visitas — registro público de visita a un inmueble ────────────

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const parsed = VisitaSchema.safeParse(body)
  if (!parsed.success) {
    // Mensaje genérico: no se devuelve qué campo falló ni por qué, para no dar
    // pistas a quien esté sondeando el endpoint.
    return NextResponse.json({ error: 'Revisa los datos del formulario.' }, { status: 400 })
  }

  // El rate limit va DESPUÉS de validar (mismo orden que /api/leads): así un
  // envío con un dato mal escrito se rechaza gratis y no le gasta la cuota a
  // quien está intentando registrarse de buena fe. Lo que protegemos es la
  // escritura en BD, que es lo abusable.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { ok } = await checkVisitaRateLimit(ip)
  if (!ok) {
    return NextResponse.json(
      { error: 'Demasiados registros desde esta conexión. Espera unos minutos e intenta de nuevo.' },
      { status: 429 },
    )
  }

  const d = parsed.data

  try {
    await prisma.visita.create({
      data: {
        nombresCompletos:      d.nombresCompletos,
        cedula:                d.cedula,
        inmuebleReferencia:    d.inmuebleReferencia,
        correo:                d.correo,
        celular:               d.celular,
        municipioOrigen:       d.municipioOrigen,
        consentAt:             new Date(), // el servidor fija la hora, no el cliente
        consentPolitica:       d.consentPolitica,
        consentControlIngreso: d.consentControlIngreso,
        ip:                    ip === 'unknown' ? null : ip,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/visitas] error al registrar visita:', err)
    return NextResponse.json(
      { error: 'No pudimos guardar tu registro. Intenta de nuevo en un momento.' },
      { status: 500 },
    )
  }
}
