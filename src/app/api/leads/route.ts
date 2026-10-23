import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { avisarLead } from '@/lib/whatsapp'

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
  // opcional: slug de la propiedad consultada (form de ficha) → enlaza property_id
  propertySlug: z.string().trim().max(200).optional(),
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

  const { nombre, telefono, mensaje, email, channel, propertySlug } = parsed.data

  let leadId: string
  try {
    // Si viene de la ficha de una propiedad, resolvemos su id para enlazarla
    let propertyId: string | null = null
    if (propertySlug) {
      const prop = await prisma.property.findUnique({
        where:  { slug: propertySlug },
        select: { id: true },
      })
      propertyId = prop?.id ?? null
    }

    const lead = await prisma.lead.create({
      data: {
        name:    nombre,
        phone:   telefono,
        email:   email ?? '',
        channel,                  // "vender-finca", "propiedad" o "web"
        message: mensaje || null,
        status:  'new',
        ...(propertyId && { property_id: propertyId }),
      },
    })
    leadId = lead.id
  } catch (err) {
    console.error('[api/leads] error al crear lead:', err)
    return NextResponse.json(
      { error: 'No pudimos guardar tu solicitud. Intenta de nuevo en un momento.' },
      { status: 500 },
    )
  }

  /* ─── EL AVISO QUE FALTABA ─────────────────────────────────────
   *
   * ⚠ Esta ruta estuvo SIN NINGUNA LÍNEA DE AVISO desde que existe. Los cuatro
   * formularios públicos del sitio postean aquí, y el 2026-10-23 se midió que 9
   * de los 12 leads de los últimos 60 días entraron por este camino sin que
   * Leonel se enterara de ninguno. No es que el aviso fallara: no existía.
   *
   * Y nadie pudo verlo antes porque el único camino instrumentado —el agente
   * Mac— era el menos usado. Las pruebas recorren el camino que el programador
   * tiene a mano, no el que la gente usa.
   *
   * VA FUERA DEL `try` DE LA ESCRITURA, a propósito, y el motivo es éste:
   *
   *   > Un aviso es un efecto secundario del registro de un lead, y un efecto
   *   > secundario no puede decidir si el hecho principal ocurrió.
   *
   * Dentro del `try`, un fallo del aviso saldría por el `catch` de la escritura
   * y devolvería un 500 diciendo «no pudimos guardar tu solicitud» sobre un
   * lead que SÍ está guardado. El visitante volvería a enviarlo y tendríamos
   * dos filas del mismo cliente.
   *
   * ⚠ La primera versión de este comentario atribuía esa colocación al
   * duplicado real de Martha Patricia Navarrete del 11 de octubre, y era una
   * justificación inventada a posteriori: en esta ruta no había NINGÚN código
   * de aviso, así que no podía lanzar nada ni producir ningún 500. Ella se
   * duplicó porque nadie le contestó. La decisión era correcta; el motivo, no.
   *
   * `avisarLead` no lanza y deja fila haga lo que haga, así que se puede
   * esperar sin envolverlo: si no sale el aviso, queda escrito por qué. Se
   * espera (y no se deja al aire) porque en serverless la función muere al
   * responder y un `fetch` sin `await` no llegaría a salir.
   */
  const intento = await avisarLead(leadId, nombre, telefono, mensaje || '')

  /* Al visitante se le dice que recibimos su solicitud, que es cierto: el lead
   * está guardado. No se le cuenta el estado del aviso interno, que no es asunto
   * suyo —pero tampoco se le promete que «te contactaremos pronto» desde aquí si
   * nadie se ha enterado: eso lo decide el texto del formulario, y queda
   * anotado—. */
  return NextResponse.json({ ok: true, aviso: intento.resultado })
}
