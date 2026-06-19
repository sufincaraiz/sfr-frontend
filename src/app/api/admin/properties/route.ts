import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { slugify } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit  = 10
  const search = searchParams.get('search')?.trim() || ''
  const status = searchParams.get('status') || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (status && status !== 'todos') where.status = status
  if (search) {
    where.OR = [
      { title:  { contains: search, mode: 'insensitive' } },
      { slug:   { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { published_at: 'desc' },
      include: {
        municipality: { select: { name: true } },
        media: { where: { is_primary: true }, take: 1 },
      },
    }),
    prisma.property.count({ where }),
  ])

  return NextResponse.json({
    properties: rows.map(r => ({ ...r, price_cop: Number(r.price_cop) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}

export async function POST(request: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const data = await request.json()

    // Buscar municipality_id por nombre
    const muni = await prisma.municipality.findFirst({
      where: { name: { contains: data.municipality_name, mode: 'insensitive' } },
    })
    if (!muni) return NextResponse.json({ error: 'Municipio no encontrado' }, { status: 400 })

    const baseSlug = `${data.type}-${slugify(data.title)}-${slugify(muni.name)}-cundinamarca`
    // Ensure unique slug
    const existing = await prisma.property.count({ where: { slug: { startsWith: baseSlug } } })
    const slug = existing > 0 ? `${baseSlug}-${Date.now()}` : baseSlug

    const { municipality_name, media, features, ...rest } = data

    const property = await prisma.property.create({
      data: {
        ...rest,
        slug,
        municipality_id: muni.id,
        price_cop: BigInt(data.price_cop || 0),
        published_at: new Date(),
        // Media
        media: media?.length ? {
          create: media.map((m: { url: string; is_primary: boolean; order: number; alt_text?: string }, i: number) => ({
            type: 'image',
            url: m.url,
            order: i,
            is_primary: i === 0,
            alt_text: m.alt_text || data.title,
          })),
        } : undefined,
        // Features
        features: features?.length ? {
          create: features.map((f: { key: string; value: string }) => ({
            feature_key: f.key,
            feature_value: f.value,
          })),
        } : undefined,
      },
      include: { municipality: true, media: true },
    })

    return NextResponse.json({ ...property, price_cop: Number(property.price_cop) }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/properties]', err)
    return NextResponse.json({ error: 'Error al crear propiedad' }, { status: 500 })
  }
}
