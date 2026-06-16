import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

const BizSchema = z.object({
  nombre:          z.string().trim().min(2).max(160),
  imagenes:        z.array(z.string().trim().max(600)).max(5).optional().default([]),
  descripcion:     z.string().trim().max(300).optional().or(z.literal('')),
  categoria:       z.string().trim().min(2).max(40),
  municipio:       z.string().trim().min(2).max(60),
  whatsapp:        z.string().trim().max(40).optional().or(z.literal('')),
  domicilios:      z.boolean().optional().default(false),
  google_maps_url: z.string().trim().max(900).optional().or(z.literal('')),
})

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const businesses = await prisma.business.findMany({ orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }] })
  return NextResponse.json({ businesses })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const parsed = BizSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data
  const imagenes = (d.imagenes ?? []).filter(Boolean).slice(0, 5)
  const biz = await prisma.business.create({
    data: {
      nombre: d.nombre, imagenes, imagen_url: imagenes[0] || null,
      descripcion: d.descripcion || null, categoria: d.categoria,
      municipio: d.municipio, whatsapp: d.whatsapp || null,
      domicilios: d.domicilios ?? false, google_maps_url: d.google_maps_url || null,
    },
  })
  revalidatePath('/directorio')
  return NextResponse.json({ ok: true, id: biz.id })
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const parsed = BizSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data
  const imagenes = (d.imagenes ?? []).filter(Boolean).slice(0, 5)
  await prisma.business.update({
    where: { id: body.id },
    data: {
      nombre: d.nombre, imagenes, imagen_url: imagenes[0] || null,
      descripcion: d.descripcion || null, categoria: d.categoria,
      municipio: d.municipio, whatsapp: d.whatsapp || null,
      domicilios: d.domicilios ?? false, google_maps_url: d.google_maps_url || null,
    },
  })
  revalidatePath('/directorio')
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  await prisma.business.delete({ where: { id } })
  revalidatePath('/directorio')
  return NextResponse.json({ ok: true })
}
