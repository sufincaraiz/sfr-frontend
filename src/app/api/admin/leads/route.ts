import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page  = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const status = searchParams.get('status') || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = status && status !== 'todos' ? { status } : {}

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        property: { select: { slug: true, title: true, type: true } },
        contacto: { select: { id: true } },
        /* LA CONSTANCIA DEL AVISO, en la ficha y no en un log.
         *
         * ⚠ Una lista VACÍA no significa «bien»: significa que por el camino de
         * ese lead no pasó código de aviso. Es el defecto que tuvieron 9 de los
         * 12 leads de los 60 días anteriores al 2026-10-23, y por eso la
         * pantalla lo distingue de «se intentó y falló» en vez de pintar los dos
         * casos igual. El orden es descendente para que el primero sea el
         * último intento, que es lo que se mira al abrir la ficha.
         *
         * `error` viaja entero: es el cuerpo literal de Meta y es lo único que
         * distingue «plantilla sin aprobar» de «token caducado». Solo lo ve un
         * admin, que ya pasó por `requireRole`. */
        avisos: {
          orderBy: { intentado_at: 'desc' },
          select: {
            resultado: true, destino: true, http_status: true,
            error: true, intentado_at: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ])

  return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) })
}

export async function PATCH(request: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, status } = await request.json()
  const updated = await prisma.lead.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}
