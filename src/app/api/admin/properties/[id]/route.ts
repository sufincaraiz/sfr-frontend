import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
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
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    const data = await request.json()
    const { municipality_name, media, features, ...rest } = data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...rest }
    if (data.price_cop !== undefined) updateData.price_cop = BigInt(data.price_cop || 0)

    if (municipality_name) {
      const muni = await prisma.municipality.findFirst({
        where: { name: { contains: municipality_name, mode: 'insensitive' } },
      })
      if (muni) updateData.municipality_id = muni.id
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

    // Actualizar features si se envía
    if (features) {
      await prisma.propertyFeature.deleteMany({ where: { property_id: id } })
      updateData.features = {
        create: features.map((f: { key: string; value: string }) => ({
          feature_key: f.key, feature_value: f.value,
        })),
      }
    }

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
      include: { municipality: true, media: true },
    })
    return NextResponse.json({ ...updated, price_cop: Number(updated.price_cop) })
  } catch (err) {
    console.error('[PUT /api/admin/properties/[id]]', err)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  try {
    await prisma.property.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/properties/[id]]', err)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
