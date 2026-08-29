import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { CIFRAS_PUBLICAS_KEY, withDefaultsCifras, type CifrasPublicas } from '@/lib/cifras-publicas'

// Cifras públicas editables (reputación de Google). Mismo patrón que
// registro-visita: una fila de PageContent, siempre normalizada con
// withDefaultsCifras para que un valor fuera de rango nunca se guarde ni se sirva.

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const row = await prisma.pageContent.findUnique({ where: { key: CIFRAS_PUBLICAS_KEY } })
  const data = withDefaultsCifras((row?.data as Partial<CifrasPublicas> | undefined) ?? null)
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  // withDefaultsCifras valida rangos: calificación 0–5, reseñas entero ≥ 0,
  // fecha AAAA-MM. Lo que no pase, cae al valor por defecto en vez de guardarse.
  const normalized = withDefaultsCifras((body as { data?: Partial<CifrasPublicas> })?.data ?? null)
  const data = normalized as unknown as Prisma.InputJsonValue

  try {
    await prisma.pageContent.upsert({
      where:  { key: CIFRAS_PUBLICAS_KEY },
      update: { data },
      create: { key: CIFRAS_PUBLICAS_KEY, data },
    })
    // Todas las superficies que muestran la cifra son estáticas/ISR: sin esto el
    // cambio no se vería hasta el siguiente despliegue. El home, Nosotros (que
    // incluye la respuesta directa de Mac) y el llms.txt.
    revalidatePath('/')
    revalidatePath('/nosotros')
    revalidatePath('/llms.txt')
    return NextResponse.json({ ok: true, data: normalized })
  } catch (err) {
    console.error('[admin/cifras-publicas] error guardando:', err)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}
