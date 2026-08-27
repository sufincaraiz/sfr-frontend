import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidarPropiedad } from '@/lib/revalidar-propiedad'
import { filtrarCampos, vaciosANull } from '@/lib/propiedad-campos'
import { fusionarFeatures, type FeatureEntrada } from '@/lib/propiedad-features'
import { requireRole } from '@/lib/auth'
import { resolveMunicipality } from '@/lib/municipality-resolve'
import { resolveTipoPropiedad } from '@/lib/property-types.server'
import { notificarIndexNow, urlsDePropiedad } from '@/lib/indexnow'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const p = await prisma.property.findUnique({
    where: { id },
    include: { municipality: true, media: { orderBy: { order: 'asc' } }, features: true },
  })
  if (!p) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json({ ...p, price_cop: Number(p.price_cop) })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const data = await request.json()
    const { municipality_name, type_label, media, features, ...rest } = data

    // LISTA BLANCA. Antes era `{ ...rest }`: cualquier columna que el cliente
    // mandara llegaba a Prisma, `slug` y `published_at` incluidos. Y los
    // vacíos de un campo de texto opcional se guardan como NULL, no como '',
    // para que abrir el formulario y guardar sin tocar nada no mute la base.
    const { datos, descartados } = filtrarCampos(rest)
    if (descartados.length) {
      console.warn(`[PUT propiedad ${id}] campos ignorados por la lista blanca: ${descartados.join(', ')}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = vaciosANull(datos)
    if (data.price_cop !== undefined) updateData.price_cop = BigInt(data.price_cop || 0)

    // Tipo escrito a mano ("Otro tipo…"): se crea en el catálogo si no existe.
    let tipoCreado: { slug: string; label: string; created: boolean } | null = null
    if (type_label) {
      try {
        tipoCreado = await resolveTipoPropiedad(type_label)
        updateData.type = tipoCreado.slug
      } catch {
        return NextResponse.json({ error: 'Tipo de inmueble inválido' }, { status: 400 })
      }
    } else if (rest.type === '') {
      delete updateData.type // no pisar el tipo actual con vacío
    }

    let muniCreated = false
    let muniSlug: string | undefined
    let muniName: string | undefined
    if (municipality_name) {
      const muni = await resolveMunicipality(municipality_name)
      updateData.municipality_id = muni.id
      muniCreated = muni.created
      muniSlug = muni.slug
      muniName = muni.name
    }

    // Actualizar media si se envía
    if (media) {
      await prisma.propertyMedia.deleteMany({ where: { property_id: id } })
      updateData.media = {
        create: media.map((m: { url: string; alt_text?: string }, i: number) => ({
          type: 'image', url: m.url, order: i,
          is_primary: i === 0, alt_text: m.alt_text || '',
        })),
      }
    }

    // Features por MERGE: solo se tocan las claves que llegan. Antes era un
    // deleteMany de TODO seguido de recrear lo enviado, así que un formulario
    // que mandara solo los servicios habría borrado clima, altitud,
    // distancia_parque y tour360_url. Ver src/lib/propiedad-features.ts.
    if (Array.isArray(features) && features.length) {
      try {
        const r = await fusionarFeatures(id, features as FeatureEntrada[])
        console.log(`[PUT propiedad ${id}] features · tocadas: ${r.tocadas.join(', ') || 'ninguna'} · borradas: ${r.borradas.join(', ') || 'ninguna'}`)
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Features inválidas' }, { status: 400 })
      }
    }

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
      include: { municipality: true, media: true },
    })
    revalidarPropiedad(updated.slug)
    // Aviso a IndexNow: indexación en minutos en vez de semanas. No se espera
    // (void) porque un fallo suyo nunca puede retrasar ni romper la publicación.
    void notificarIndexNow(
      urlsDePropiedad(updated.slug, updated.municipality?.slug),
      `propiedad actualizada ${updated.slug}`,
    )
    return NextResponse.json({
      ...updated,
      price_cop: Number(updated.price_cop),
      municipality_created: muniCreated,
      municipality_slug: muniSlug,
      municipality_new_name: muniName,
      type_created: tipoCreado?.created ?? false,
      type_new_label: tipoCreado?.label ?? null,
    })
  } catch (err) {
    console.error('[PUT /api/admin/properties/[id]]', err)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const deleted = await prisma.property.delete({ where: { id } })
    revalidarPropiedad(deleted.slug)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/properties/[id]]', err)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
