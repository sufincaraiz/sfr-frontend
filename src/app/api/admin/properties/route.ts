import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidarPropiedad } from '@/lib/revalidar-propiedad'
import { requireRole } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { resolveMunicipality } from '@/lib/municipality-resolve'
import { resolveTipoPropiedad } from '@/lib/property-types.server'
import { notificarIndexNow, urlsDePropiedad } from '@/lib/indexnow'

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

    // Resolver municipio por nombre; si no existe, se crea (oculto)
    let muni: { id: string; name: string; slug: string; created: boolean }
    try {
      muni = await resolveMunicipality(data.municipality_name)
    } catch {
      return NextResponse.json({ error: 'Municipio inválido' }, { status: 400 })
    }

    // Tipo: si el admin escribió uno nuevo ("Otro tipo…") se crea en el catálogo
    // y se usa su slug; si no, se conserva el valor del selector.
    let tipoSlug: string = data.type
    let tipoCreado: { slug: string; label: string; created: boolean } | null = null
    if (data.type_label) {
      try {
        tipoCreado = await resolveTipoPropiedad(data.type_label)
        tipoSlug = tipoCreado.slug
      } catch {
        return NextResponse.json({ error: 'Tipo de inmueble inválido' }, { status: 400 })
      }
    }
    if (!tipoSlug) return NextResponse.json({ error: 'Falta el tipo de inmueble' }, { status: 400 })

    const baseSlug = `${tipoSlug}-${slugify(data.title)}-${slugify(muni.name)}-cundinamarca`
    // Ensure unique slug
    const existing = await prisma.property.count({ where: { slug: { startsWith: baseSlug } } })
    const slug = existing > 0 ? `${baseSlug}-${Date.now()}` : baseSlug

    const { municipality_name, type_label, media, features, ...rest } = data

    const property = await prisma.property.create({
      data: {
        ...rest,
        type: tipoSlug,
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

    // Sin esto, la propiedad recién creada NO aparecía en el catálogo ni en
    // la portada hasta que venciera el ISR de una hora. Corría solo al editar.
    revalidarPropiedad(property.slug)

    // Aviso a IndexNow. Incluye la página del municipio: publicar la PRIMERA
    // propiedad de un municipio lo mete en el filtro del buscador y cambia su
    // página, así que es justo cuando conviene que Bing la vuelva a leer.
    // Es la promoción automática de la doctrina §1.2.
    void notificarIndexNow(
      urlsDePropiedad(property.slug, property.municipality?.slug),
      `propiedad publicada ${property.slug}`,
    )

    return NextResponse.json({
      ...property,
      price_cop: Number(property.price_cop),
      municipality_created: muni.created,
      municipality_slug: muni.slug,
      municipality_new_name: muni.name,
      type_created: tipoCreado?.created ?? false,
      type_new_label: tipoCreado?.label ?? null,
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/properties]', err)
    return NextResponse.json({ error: 'Error al crear propiedad' }, { status: 500 })
  }
}
