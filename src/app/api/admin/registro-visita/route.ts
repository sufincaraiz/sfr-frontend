import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { REGISTRO_VISITA_KEY, withDefaults, type RegistroVisitaContent } from '@/lib/registro-visita'

// Contenido editable de /registro-visita. Mismo patrón que propuesta-comercial:
// una fila de PageContent, siempre normalizada con withDefaults para que la
// estructura esté completa aunque el body venga parcial o de una versión vieja.

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const row = await prisma.pageContent.findUnique({ where: { key: REGISTRO_VISITA_KEY } })
  const data = withDefaults((row?.data as Partial<RegistroVisitaContent> | undefined) ?? null)
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const normalized = withDefaults((body as { data?: Partial<RegistroVisitaContent> })?.data ?? null)
  const data = normalized as unknown as Prisma.InputJsonValue

  try {
    await prisma.pageContent.upsert({
      where:  { key: REGISTRO_VISITA_KEY },
      update: { data },
      create: { key: REGISTRO_VISITA_KEY, data },
    })
    // La página pública es estática; sin esto los cambios no se verían hasta el
    // siguiente despliegue.
    revalidatePath('/registro-visita')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/registro-visita] error guardando:', err)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}
