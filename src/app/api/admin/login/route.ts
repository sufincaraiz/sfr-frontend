import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { roleHome } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!admin || !(await bcrypt.compare(password, admin.password)))
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })

    if (!admin.activo)
      return NextResponse.json({ error: 'Usuario desactivado. Contacta al administrador.' }, { status: 403 })

    const token = createToken({ id: admin.id, email: admin.email, role: admin.role })
    const res = NextResponse.json({ ok: true, nombre: admin.nombre, role: admin.role, home: roleHome(admin.role) })
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
