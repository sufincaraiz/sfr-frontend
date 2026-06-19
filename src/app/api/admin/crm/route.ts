import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ETAPAS, TIPOS, ORIGENES } from '@/lib/crm'

const CRM_ROLES = ['admin', 'asistente_crm']

const BaseSchema = z.object({
  nombre:              z.string().trim().min(2).max(160),
  telefono:            z.string().trim().max(40).optional().or(z.literal('')),
  email:              z.string().trim().max(160).optional().or(z.literal('')),
  tipo:                z.enum(TIPOS).optional().default('comprador'),
  interes:             z.string().trim().max(1000).optional().or(z.literal('')),
  etapa:               z.enum(ETAPAS).optional().default('nuevo'),
  proximo_seguimiento: z.string().trim().optional().or(z.literal('')),
  origen:              z.enum(ORIGENES).optional().default('manual'),
  notas:               z.string().trim().max(2000).optional().or(z.literal('')),
})

const UpdateSchema = BaseSchema.partial().extend({ id: z.string().min(1) })

function parseFecha(v: string | undefined | null): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function GET() {
  const session = await requireRole(CRM_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const contactos = await prisma.contacto.findMany({ orderBy: [{ created_at: 'desc' }] })
  return NextResponse.json({ contactos })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(CRM_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })

  // ── Conversión Lead → Contacto (solo Admin) ────────────────────────────────
  if (typeof body.lead_id === 'string' && body.lead_id) {
    if (session.role !== 'admin')
      return NextResponse.json({ error: 'Solo un administrador puede convertir leads.' }, { status: 403 })

    const lead = await prisma.lead.findUnique({ where: { id: body.lead_id } })
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

    try {
      const contacto = await prisma.contacto.create({
        data: {
          nombre: lead.name,
          telefono: lead.phone || null,
          email: lead.email || null,
          interes: lead.message || lead.interestZone || null,
          etapa: 'nuevo',
          origen: 'lead-web',
          lead_id: lead.id,
          created_by: session.id,
        },
      })
      return NextResponse.json({ ok: true, contacto }, { status: 201 })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
        return NextResponse.json({ error: 'Este lead ya fue pasado al CRM.' }, { status: 409 })
      console.error('[POST /api/admin/crm convert]', err)
      return NextResponse.json({ error: 'Error al convertir el lead' }, { status: 500 })
    }
  }

  // ── Alta manual ────────────────────────────────────────────────────────────
  const parsed = BaseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data
  const contacto = await prisma.contacto.create({
    data: {
      nombre: d.nombre,
      telefono: d.telefono || null,
      email: d.email || null,
      tipo: d.tipo,
      interes: d.interes || null,
      etapa: d.etapa,
      proximo_seguimiento: parseFecha(d.proximo_seguimiento),
      origen: d.origen,
      notas: d.notas || null,
      created_by: session.id,
    },
  })
  return NextResponse.json({ ok: true, contacto }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(CRM_ROLES)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const { id, ...d } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (d.nombre !== undefined) data.nombre = d.nombre
  if (d.telefono !== undefined) data.telefono = d.telefono || null
  if (d.email !== undefined) data.email = d.email || null
  if (d.tipo !== undefined) data.tipo = d.tipo
  if (d.interes !== undefined) data.interes = d.interes || null
  if (d.etapa !== undefined) data.etapa = d.etapa
  if (d.proximo_seguimiento !== undefined) data.proximo_seguimiento = parseFecha(d.proximo_seguimiento)
  if (d.origen !== undefined) data.origen = d.origen
  if (d.notas !== undefined) data.notas = d.notas || null

  try {
    const contacto = await prisma.contacto.update({ where: { id }, data })
    return NextResponse.json({ ok: true, contacto })
  } catch {
    return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  // Borrar queda restringido al Admin (la Asistente solo crea/edita).
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  await prisma.contacto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
