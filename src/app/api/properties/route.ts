import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo      = searchParams.get('tipo')
    const municipio = searchParams.get('municipio')
    const maxPrecio = searchParams.get('maxPrecio')
    const featured  = searchParams.get('featured') === 'true'
    const page      = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit     = Math.min(50, parseInt(searchParams.get('limit') || '12'))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { status: 'available' }

    if (tipo && tipo !== 'todos')       where.type = tipo
    if (maxPrecio)                       where.price_cop = { lte: BigInt(maxPrecio) }
    if (municipio && municipio !== 'todos') {
      where.municipality = {
        name: { contains: municipio, mode: 'insensitive' },
      }
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: [{ published_at: 'desc' }],
        include: {
          municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
          media:        { orderBy: { order: 'asc' }, take: 8 },
        },
      }),
      prisma.property.count({ where }),
    ])

    // Serializar BigInt a string/number para JSON
    const serialized = properties.map(p => ({
      id:              p.id,
      slug:            p.slug,
      type:            p.type,
      transaction_type: p.transaction_type,
      municipality_id: p.municipality_id,
      price_cop:       Number(p.price_cop),
      area_lot_m2:     p.area_lot_m2,
      area_built_m2:   p.area_built_m2,
      bedrooms:        p.bedrooms,
      bathrooms:       p.bathrooms,
      parking:         p.parking,
      status:          p.status,
      geo_lat:         p.geo_lat,
      geo_lng:         p.geo_lng,
      published_at:    p.published_at,
      updated_at:      p.updated_at,
      title:           p.title,
      short_description: p.short_description,
      meta_title:      p.meta_title,
      meta_description: p.meta_description,
      municipality:    p.municipality,
      media:           p.media,
    }))

    return NextResponse.json({
      properties: featured ? serialized.slice(0, 6) : serialized,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Error al obtener propiedades' },
      { status: 500 }
    )
  }
}
