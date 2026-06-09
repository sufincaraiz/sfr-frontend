import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const property = await prisma.property.findUnique({
      where:   { slug },
      include: {
        municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
        media:        { orderBy: { order: 'asc' } },
        features:     true,
      },
    })

    if (!property || property.status === 'sold') {
      return NextResponse.json(
        { error: 'Propiedad no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id:               property.id,
      slug:             property.slug,
      type:             property.type,
      transaction_type: property.transaction_type,
      municipality_id:  property.municipality_id,
      price_cop:        Number(property.price_cop),
      area_lot_m2:      property.area_lot_m2,
      area_built_m2:    property.area_built_m2,
      bedrooms:         property.bedrooms,
      bathrooms:        property.bathrooms,
      parking:          property.parking,
      status:           property.status,
      geo_lat:          property.geo_lat,
      geo_lng:          property.geo_lng,
      published_at:     property.published_at,
      updated_at:       property.updated_at,
      title:            property.title,
      short_description: property.short_description,
      description:      property.description,
      meta_title:       property.meta_title,
      meta_description: property.meta_description,
      municipality:     property.municipality,
      media:            property.media,
      features:         property.features,
    })
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
