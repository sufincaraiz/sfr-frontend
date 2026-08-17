import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import { pluralizar } from '@/lib/property-types'

const BaseSchema = z.object({
  slug:   z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug inválido: usa minúsculas, números y guiones').optional(),
  label:  z.string().trim().min(2).max(60),
  plural: z.string().trim().max(80).optional().or(z.literal('')),
  orden:  z.number().int().min(0).max(9999).optional(),
  oculto: z.boolean().optional(),
})
const UpdateSchema = BaseSchema.partial().extend({ id: z.string().min(1) })

/**
 * La etiqueta de un tipo aflora en ~50 páginas: el <title> de cada ficha, las
 * rutas limpias, las páginas de municipio y de vereda, y el sitemap. Revalidar
 * solo la portada y el catálogo dejaba el resto desactualizado hasta una hora.
 *
 * El riesgo no es la página vieja: es que quien hizo el cambio lo vea sin
 * efecto, piense que no funcionó y lo deshaga.
 */
function revalidar() {
  revalidatePath('/')
  revalidatePath('/propiedades')
  // layout: arrastra las rutas hijas de cada árbol
  revalidatePath('/propiedad/[slug]', 'page')
  revalidatePath('/propiedades/[filtro]', 'page')
  revalidatePath('/propiedades/[filtro]/[municipio]', 'page')
  revalidatePath('/municipios/[slug]', 'page')
  revalidatePath('/veredas/[slug]', 'page')
  revalidatePath('/propiedades/en-condominio')
  revalidatePath('/sitemap-propiedades.xml')
  revalidatePath('/sitemap-paginas.xml')
  // El índice de enlaces y los tipos ofrecibles se derivan del mismo catálogo.
  revalidateTag('enlaces')
}

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Incluye ocultos: en el admin hay que poder reasignar y reactivar.
  const tipos = await prisma.tipoPropiedad.findMany({
    orderBy: [{ orden: 'asc' }, { label: 'asc' }],
  })

  // Conteo de propiedades por tipo, para avisar antes de ocultar/borrar.
  const conteos = await prisma.property.groupBy({ by: ['type'], _count: { _all: true } })
  const porTipo = Object.fromEntries(conteos.map(c => [c.type, c._count._all]))

  return NextResponse.json({
    tipos: tipos.map(t => ({ ...t, propiedades: porTipo[t.slug] ?? 0 })),
  })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = BaseSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  const slug = d.slug || slugify(d.label)
  if (!slug) return NextResponse.json({ error: 'No se pudo generar el identificador' }, { status: 400 })

  try {
    const ultimo = await prisma.tipoPropiedad.aggregate({ _max: { orden: true } })
    const t = await prisma.tipoPropiedad.create({
      data: {
        slug,
        label: d.label,
        plural: d.plural || pluralizar(d.label),
        orden: d.orden ?? (ultimo._max.orden ?? 100) + 10,
        oculto: d.oculto ?? false,
      },
    })
    revalidar()
    return NextResponse.json({ ok: true, id: t.id, slug: t.slug }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return NextResponse.json({ error: 'Ya existe un tipo con ese identificador.' }, { status: 409 })
    console.error('[POST /api/admin/property-types]', err)
    return NextResponse.json({ error: 'Error al crear el tipo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
  const { id, ...d } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (d.label  !== undefined) data.label  = d.label
  if (d.plural !== undefined) data.plural = d.plural || null
  if (d.orden  !== undefined) data.orden  = d.orden
  if (d.oculto !== undefined) data.oculto = d.oculto
  // El slug NO se edita: es el valor guardado en Property.type y renombrarlo
  // dejaría huérfanas las propiedades existentes.

  try {
    await prisma.tipoPropiedad.update({ where: { id }, data })
    revalidar()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUT /api/admin/property-types]', err)
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const tipo = await prisma.tipoPropiedad.findUnique({ where: { id }, select: { slug: true } })
  if (!tipo) return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 })

  // Nunca borramos un tipo en uso: dejaría propiedades fuera de los filtros.
  const enUso = await prisma.property.count({ where: { type: tipo.slug } })
  if (enUso > 0) {
    return NextResponse.json(
      { error: `Hay ${enUso} propiedad${enUso === 1 ? '' : 'es'} con este tipo. Ocúltalo en vez de borrarlo, o reasígnalas primero.` },
      { status: 409 },
    )
  }

  await prisma.tipoPropiedad.delete({ where: { id } })
  revalidar()
  return NextResponse.json({ ok: true })
}
