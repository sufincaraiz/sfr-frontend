import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET!

export interface AdminSessionUser {
  id: string
  email: string
  nombre: string
  role: string
}

export function createToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string }
  } catch {
    return null
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Sesión autoritativa: valida el JWT y vuelve a consultar la BD para respetar la
 * desactivación inmediata (`activo`) y el rol/nombre vigentes. Devuelve null si el
 * token es inválido, el usuario no existe o está desactivado.
 */
export async function requireSession(): Promise<AdminSessionUser | null> {
  const s = await getAdminSession()
  if (!s) return null
  const user = await prisma.admin.findUnique({ where: { id: s.id } })
  if (!user || !user.activo) return null
  return { id: user.id, email: user.email, nombre: user.nombre, role: user.role }
}

/** Igual que requireSession pero además exige que el rol esté en `roles`. null si no autorizado. */
export async function requireRole(roles: string[]): Promise<AdminSessionUser | null> {
  const s = await requireSession()
  if (!s || !roles.includes(s.role)) return null
  return s
}

// ─── Sesión del escritor del blog colaborativo (credencial única) ─────────────

export function createBlogToken(user: string) {
  return jwt.sign({ user, role: 'blog_writer' }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyBlogToken(token: string) {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { user: string; role: string }
    return payload.role === 'blog_writer' ? payload : null
  } catch {
    return null
  }
}

export async function getBlogWriterSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('blog_writer_token')?.value
  if (!token) return null
  return verifyBlogToken(token)
}
