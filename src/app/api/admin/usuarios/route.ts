import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { ROLES } from '@/lib/permissions'

const roleEnum = z.enum(ROLES)

const CreateSchema = z.object({
  nombre:   z.string().trim().min(2).max(120),
  email:    z.string().trim().email().max(160),
  role:     roleEnum,
  password: z.string().min(8).max(200),
})

const UpdateSchema = z.object({
  id:       z.string().min(1),
  role:     roleEnum.optional(),
  activo:   z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
})

// Vista pública (nunca incluye la contraseña)
const SELECT = { id: true, nombre: true, email: true, role: true, activo: true, created_at: true } as const

export async function GET() {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const usuarios = await prisma.admin.findMany({ select: SELECT, orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] })
  return NextResponse.json({ usuarios })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  try {
    const usuario = await prisma.admin.create({
      data: {
        nombre: d.nombre,
        email: d.email.toLowerCase().trim(),
        role: d.role,
        password: await bcrypt.hash(d.password, 10),
      },
      select: SELECT,
    })
    return NextResponse.json({ ok: true, usuario }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      return NextResponse.json({ error: 'Ya existe un usuario con ese correo.' }, { status: 409 })
    console.error('[POST /api/admin/usuarios]', err)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireRole(['admin'])
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const d = parsed.data

  const target = await prisma.admin.findUnique({ where: { id: d.id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  // Salvaguarda: no dejar el sistema sin un administrador activo.
  const willBeActive = d.activo ?? target.activo
  const willBeRole = d.role ?? target.role
  const eraAdminActivo = target.activo && target.role === 'admin'
  const dejaDeSerAdminActivo = eraAdminActivo && !(willBeActive && willBeRole === 'admin')
  if (dejaDeSerAdminActivo) {
    const otrosAdmins = await prisma.admin.count({ where: { role: 'admin', activo: true, id: { not: d.id } } })
    if (otrosAdmins === 0)
      return NextResponse.json({ error: 'No puedes dejar el sistema sin un administrador activo.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (d.role !== undefined) data.role = d.role
  if (d.activo !== undefined) data.activo = d.activo
  if (d.password !== undefined) data.password = await bcrypt.hash(d.password, 10) // reset; nunca se devuelve

  const usuario = await prisma.admin.update({ where: { id: d.id }, data, select: SELECT })
  return NextResponse.json({ ok: true, usuario })
}
