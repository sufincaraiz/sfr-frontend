import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Captura en lote de ACCESO y SERVICIOS.
//
// Los dos datos que la auditoría de hechos adversos encontró ausentes en más
// fichas, y los dos que un comprador de predio rural pregunta primero. Se
// guardan como `property_features` —`acceso` (texto libre, una fila) y
// `servicio` (una fila por servicio)— que es el esquema que ya usaba el admin.
//
// Revalida la ficha al guardar: un UPDATE por script NO dispara
// revalidatePath(), y el sitio seguiría sirviendo la versión vieja hasta que
// venza el ISR. Esa lección costó una sesión entera.
// ─────────────────────────────────────────────────────────────────────────────

const Fila = z.object({
  id: z.string().min(1),
  acceso: z.string().trim().max(400).optional(),
  servicios: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
})

const Cuerpo = z.object({ filas: z.array(Fila).max(60) })

export async function PUT(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }) }

  const parsed = Cuerpo.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })

  let guardadas = 0

  for (const fila of parsed.data.filas) {
    const p = await prisma.property.findUnique({ where: { id: fila.id }, select: { id: true, slug: true } })
    if (!p) continue

    const tocaAcceso = fila.acceso !== undefined
    const tocaServicios = fila.servicios !== undefined
    if (!tocaAcceso && !tocaServicios) continue

    await prisma.$transaction(async tx => {
      if (tocaAcceso) {
        await tx.propertyFeature.deleteMany({ where: { property_id: p.id, feature_key: 'acceso' } })
        if (fila.acceso) {
          await tx.propertyFeature.create({ data: { property_id: p.id, feature_key: 'acceso', feature_value: fila.acceso } })
        }
      }
      if (tocaServicios) {
        // Se reemplaza el conjunto entero: es lo que el formulario representa.
        await tx.propertyFeature.deleteMany({ where: { property_id: p.id, feature_key: 'servicio' } })
        for (const s of fila.servicios ?? []) {
          await tx.propertyFeature.create({ data: { property_id: p.id, feature_key: 'servicio', feature_value: s } })
        }
      }
    })

    revalidatePath(`/propiedad/${p.slug}`)
    guardadas++
  }

  revalidatePath('/propiedades')
  return NextResponse.json({ ok: true, guardadas })
}
