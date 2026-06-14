import { NextRequest, NextResponse } from 'next/server'
import { createBlogToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { user, password } = await request.json()
    const U = process.env.BLOG_WRITER_USER
    const P = process.env.BLOG_WRITER_PASSWORD

    if (!U || !P) {
      console.error('[blog-writer/login] faltan BLOG_WRITER_USER / BLOG_WRITER_PASSWORD')
      return NextResponse.json({ error: 'Acceso no configurado.' }, { status: 500 })
    }

    if (typeof user !== 'string' || typeof password !== 'string' ||
        user.trim() !== U || password !== P) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 })
    }

    const token = createBlogToken(U)
    const res = NextResponse.json({ ok: true })
    res.cookies.set('blog_writer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    return res
  } catch (err) {
    console.error('[blog-writer/login]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
