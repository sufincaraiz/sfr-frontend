import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

// Revocar un enlace de dueño. Se marca `revocado` en vez de borrar la fila para
// conservar el rastro: cuándo se creó, cuándo se usó por última vez y cuándo se
// apagó. Un acceso a datos personales conviene poder auditarlo después.

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  let body: { revocado?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  if (body.revocado !== true) {
    return NextResponse.json({ error: 'Solo se admite revocar.' }, { status: 400 })
  }

  const enlace = await prisma.enlaceVisitantes.findUnique({ where: { id }, select: { id: true } })
  if (!enlace) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.enlaceVisitantes.update({ where: { id }, data: { revocado: true } })
  console.log(`[admin/visitas/enlaces] ${session.email} revocó el enlace ${id}.`)

  return NextResponse.json({ ok: true })
}
