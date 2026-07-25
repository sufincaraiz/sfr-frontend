import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const FaqSchema = z.object({
  question: z.string().trim().max(300),
  answer:   z.string().trim().max(2000),
})

const BaseSchema = z.object({
  slug:                z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug inválido: usa minúsculas, números y guiones'),
  name:                z.string().trim().min(2).max(100),
  provincia:           z.string().trim().max(60).optional().or(z.literal('')),
  distancia_bogota_km: z.number().int().min(0).max(3000).nullable().optional(),
  tiempo_bogota_min:   z.number().int().min(0).max(3000).nullable().optional(),
  altitud_msnm:        z.number().int().min(0).max(6000).nullable().optional(),
  temp_min:            z.number().int().min(-10).max(50).nullable().optional(),
  temp_max:            z.number().int().min(-10).max(50).nullable().optional(),
  descripcion_seo:     z.string().trim().max(2000).optional().or(z.literal('')),
  meta_description:    z.string().trim().max(320).optional().or(z.literal('')),
  historia:            z.string().trim().max(6000).optional().or(z.literal('')),
  clima:               z.string().trim().max(6000).optional().or(z.literal('')),
  turismo:             z.string().trim().max(6000).optional().or(z.literal('')),
  inversion:           z.string().trim().max(6000).optional().or(z.literal('')),
  og_image:            z.string().trim().max(600).optional().or(z.literal('')),
  geo_lat:             z.number().min(-90).max(90).nullable().optional(),
  geo_lng:             z.number().min(-180).max(180).nullable().optional(),
  wikipedia_url:       z.string().trim().max(600).optional().or(z.literal('')),
  faqs:                z.array(FaqSchema).max(20).optional(),
  tour360_url:         z.string().trim().max(600).optional().or(z.literal('')),
  oculto:              z.boolean().optional(),
})
const UpdateSchema = BaseSchema.partial().extend({ id: z.string().min(1) })

function revalidar(slug?: string | null) {
  revalidatePath('/')            // footer
  revalidatePath('/municipios')
  if (slug) revalidatePath(`/municipios/${slug}`)
}

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const municipios = await prisma.municipality.findMany({ orderBy: [{ oculto: 'asc' }, { name: 'asc' }] })
  return NextResponse.json({ municipios })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = BaseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  try {
    const m = await prisma.municipality.create({
      data: {
        slug: d.slug,
        name: d.name,
        provincia: d.provincia || 'Gualivá',
        distancia_bogota_km: d.distancia_bogota_km ?? null,
        tiempo_bogota_min: d.tiempo_bogota_min ?? null,
        altitud_msnm: d.altitud_msnm ?? null,
        temp_min: d.temp_min ?? null,
        temp_max: d.temp_max ?? null,
        descripcion_seo: d.descripcion_seo || null,
        meta_description: d.meta_description || null,
        historia: d.historia || null,
        clima: d.clima || null,
        turismo: d.turismo || null,
        inversion: d.inversion || null,
        og_image: d.og_image || null,
        geo_lat: d.geo_lat ?? null,
        geo_lng: d.geo_lng ?? null,
        wikipedia_url: d.wikipedia_url || null,
        faqs: (d.faqs ?? []) as Prisma.InputJsonValue,
        tour360_url: d.tour360_url || null,
        oculto: d.oculto ?? false,
      },
    })
    revalidar(m.slug)
    return NextResponse.json({ ok: true, id: m.id }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return NextResponse.json({ error: 'Ya existe un municipio con ese slug.' }, { status: 409 })
    console.error('[POST /api/admin/municipios]', err)
    return NextResponse.json({ error: 'Error al crear el municipio' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const { id, ...d } = parsed.data

  const text = (v: string | undefined) => (v === undefined ? undefined : v || null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (d.slug !== undefined) data.slug = d.slug
  if (d.name !== undefined) data.name = d.name
  if (d.provincia !== undefined) data.provincia = d.provincia || 'Gualivá'
  if (d.distancia_bogota_km !== undefined) data.distancia_bogota_km = d.distancia_bogota_km
  if (d.tiempo_bogota_min !== undefined) data.tiempo_bogota_min = d.tiempo_bogota_min
  if (d.altitud_msnm !== undefined) data.altitud_msnm = d.altitud_msnm
  if (d.temp_min !== undefined) data.temp_min = d.temp_min
  if (d.temp_max !== undefined) data.temp_max = d.temp_max
  if (d.descripcion_seo !== undefined) data.descripcion_seo = text(d.descripcion_seo)
  if (d.meta_description !== undefined) data.meta_description = text(d.meta_description)
  if (d.historia !== undefined) data.historia = text(d.historia)
  if (d.clima !== undefined) data.clima = text(d.clima)
  if (d.turismo !== undefined) data.turismo = text(d.turismo)
  if (d.inversion !== undefined) data.inversion = text(d.inversion)
  if (d.og_image !== undefined) data.og_image = text(d.og_image)
  if (d.geo_lat !== undefined) data.geo_lat = d.geo_lat
  if (d.geo_lng !== undefined) data.geo_lng = d.geo_lng
  if (d.wikipedia_url !== undefined) data.wikipedia_url = text(d.wikipedia_url)
  if (d.faqs !== undefined) data.faqs = d.faqs as Prisma.InputJsonValue
  if (d.tour360_url !== undefined) data.tour360_url = text(d.tour360_url)
  if (d.oculto !== undefined) data.oculto = d.oculto

  try {
    const m = await prisma.municipality.update({ where: { id }, data })
    revalidar(m.slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return NextResponse.json({ error: 'Ya existe un municipio con ese slug.' }, { status: 409 })
    console.error('[PUT /api/admin/municipios]', err)
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 })
  }
}
