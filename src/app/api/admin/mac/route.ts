import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { invalidarConocimiento } from '@/lib/agent/knowledge'

/** Fichas de la base de conocimiento de Mac (lo que el agente sabe además de su prompt). */
const FichaSchema = z.object({
  titulo:        z.string().trim().min(3).max(120),
  contenido:     z.string().trim().min(5).max(4000),
  categoria:     z.string().trim().min(2).max(40).optional().default('General'),
  activo:        z.boolean().optional().default(true),
  orden:         z.number().int().min(0).max(999).optional().default(0),
  vigente_hasta: z.string().trim().optional().or(z.literal('')),
})

function fechaVigencia(v?: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const fichas = await prisma.macKnowledge.findMany({
    orderBy: [{ orden: 'asc' }, { updated_at: 'desc' }],
  })
  return NextResponse.json({ fichas })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const parsed = FichaSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data
  const ficha = await prisma.macKnowledge.create({
    data: {
      titulo: d.titulo, contenido: d.contenido, categoria: d.categoria ?? 'General',
      activo: d.activo ?? true, orden: d.orden ?? 0,
      vigente_hasta: fechaVigencia(d.vigente_hasta),
    },
  })
  invalidarConocimiento()
  return NextResponse.json({ ok: true, id: ficha.id })
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { id?: string } | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const parsed = FichaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data
  await prisma.macKnowledge.update({
    where: { id: body.id },
    data: {
      titulo: d.titulo, contenido: d.contenido, categoria: d.categoria ?? 'General',
      activo: d.activo ?? true, orden: d.orden ?? 0,
      vigente_hasta: fechaVigencia(d.vigente_hasta),
    },
  })
  invalidarConocimiento()
  return NextResponse.json({ ok: true })
}

/** PATCH: encender/apagar una ficha sin abrir el formulario. */
export async function PATCH(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { id?: string; activo?: boolean } | null
  if (!body?.id || typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  await prisma.macKnowledge.update({ where: { id: body.id }, data: { activo: body.activo } })
  invalidarConocimiento()
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  await prisma.macKnowledge.delete({ where: { id } })
  invalidarConocimiento()
  return NextResponse.json({ ok: true })
}
