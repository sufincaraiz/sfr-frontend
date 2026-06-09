import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
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
      },
    }),
    prisma.lead.count({ where }),
  ])

  return NextResponse.json({ leads, total, page, pages: Math.ceil(total / limit) })
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, status } = await request.json()
  const updated = await prisma.lead.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}
