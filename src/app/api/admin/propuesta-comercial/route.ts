import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { PROPUESTA_KEY, withDefaults, type PropuestaContent } from '@/lib/propuesta'

// Cargar el contenido actual (con defaults aplicados)
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const row = await prisma.pageContent.findUnique({ where: { key: PROPUESTA_KEY } })
  const data = withDefaults((row?.data as Partial<PropuestaContent> | undefined) ?? null)
  return NextResponse.json({ data })
}

// Guardar el contenido
export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  // Normalizamos con defaults para garantizar la estructura completa
  const normalized = withDefaults((body as { data?: Partial<PropuestaContent> })?.data ?? null)
  const data = normalized as unknown as Prisma.InputJsonValue

  try {
    await prisma.pageContent.upsert({
      where:  { key: PROPUESTA_KEY },
      update: { data },
      create: { key: PROPUESTA_KEY, data },
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/propuesta-comercial] error guardando:', err)
    return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })
  }
}
