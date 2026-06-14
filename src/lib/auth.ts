import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET!

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
