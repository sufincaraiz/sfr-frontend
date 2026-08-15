/**
 * Asignación de vereda en lote.
 *
 * `vereda_id` es, junto a `area_built_m2`, el campo con más peso sobre lo que
 * se puede publicar: la vereda determina acceso, servicios y valor. Con 36
 * fichas y 20 veredas en tabla, editarlas una a una desde la ficha es donde
 * se cuelan los errores; esta ruta sirve la pantalla que las muestra juntas.
 *
 * La vereda tiene que pertenecer al municipio de la propiedad. Una vereda mal
 * asignada es peor que ninguna, así que el cruce se valida en el servidor y no
 * solo en el desplegable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { getAllVeredasData, buscarNombreVeredaEnTexto } from '@/lib/veredas-data'

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const [propiedades, veredas] = await Promise.all([
    prisma.property.findMany({
      select: {
        id: true, slug: true, title: true, type: true, status: true,
        description: true,
        municipality: { select: { id: true, name: true, slug: true } },
        vereda: { select: { id: true, name: true } },
      },
      orderBy: [{ municipality: { name: 'asc' } }, { title: 'asc' }],
    }),
    prisma.vereda.findMany({
      select: {
        id: true, slug: true, name: true,
        municipality: { select: { id: true, name: true } },
        _count: { select: { properties: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const conPagina = new Set(getAllVeredasData().map(v => v.slug))

  return NextResponse.json({
    propiedades: propiedades.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      status: p.status,
      municipality_id: p.municipality?.id ?? null,
      municipality_name: p.municipality?.name ?? null,
      vereda_id: p.vereda?.id ?? null,
      vereda_name: p.vereda?.name ?? null,
      // Pista, no dato: la vereda citada en el texto de la ficha. Sirve para
      // que quien asigna vea de dónde saldría el dato, no para autoasignar.
      pista: pistaDeVereda(p.description, veredas.map(v => v.name)),
    })),
    veredas: veredas.map(v => ({
      id: v.id, slug: v.slug, name: v.name,
      municipality_id: v.municipality.id,
      municipality_name: v.municipality.name,
      propiedades: v._count.properties,
      con_pagina: conPagina.has(v.slug),
    })),
  })
}

/**
 * Vereda citada en la descripción de la ficha, si aparece alguna. El emparejado
 * tolera el artículo: «vereda Rosario» encuentra la fila de «El Rosario».
 */
function pistaDeVereda(descripcion: string | null, nombres: string[]): string | null {
  return descripcion ? buscarNombreVeredaEnTexto(descripcion, nombres) : null
}

const AsignacionSchema = z.object({
  asignaciones: z.array(z.object({
    property_id: z.string().min(1),
    // null = quitar la vereda.
    vereda_id: z.string().min(1).nullable(),
  })).min(1).max(200),
})

export async function PATCH(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = AsignacionSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', detalle: parsed.error.issues }, { status: 400 })
  }
  const { asignaciones } = parsed.data

  const [props, veredas] = await Promise.all([
    prisma.property.findMany({
      where: { id: { in: asignaciones.map(a => a.property_id) } },
      select: { id: true, title: true, municipality_id: true },
    }),
    prisma.vereda.findMany({ select: { id: true, slug: true, name: true, municipality_id: true } }),
  ])
  const porProp = new Map(props.map(p => [p.id, p]))
  const porVereda = new Map(veredas.map(v => [v.id, v]))

  // Validar TODO antes de escribir nada: un lote a medias deja el catálogo
  // en un estado que nadie pidió.
  const errores: string[] = []
  for (const a of asignaciones) {
    const prop = porProp.get(a.property_id)
    if (!prop) { errores.push(`Propiedad ${a.property_id} no existe`); continue }
    if (a.vereda_id === null) continue
    const ver = porVereda.get(a.vereda_id)
    if (!ver) { errores.push(`Vereda ${a.vereda_id} no existe`); continue }
    if (ver.municipality_id !== prop.municipality_id) {
      errores.push(`«${prop.title ?? prop.id}»: la vereda ${ver.name} es de otro municipio`)
    }
  }
  if (errores.length) return NextResponse.json({ error: 'Asignación rechazada', errores }, { status: 400 })

  const cambios = asignaciones.filter(a => porProp.has(a.property_id))
  await prisma.$transaction(
    cambios.map(a => prisma.property.update({
      where: { id: a.property_id },
      data: { vereda_id: a.vereda_id },
    })),
  )

  revalidatePath('/propiedades')
  revalidatePath('/veredas')
  for (const a of cambios) {
    const v = a.vereda_id ? porVereda.get(a.vereda_id) : null
    if (v) revalidatePath(`/veredas/${v.slug}`)
  }

  return NextResponse.json({ ok: true, actualizadas: cambios.length })
}
