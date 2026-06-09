import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-me'
)

const CANONICAL_HOST = 'www.sufincaraiz.com'

async function verifyEdgeToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Bloquea indexación de hosts no canónicos (*.vercel.app, previews, etc.) ─
  // Condición: si el host NO es exactamente www.sufincaraiz.com → noindex
  const host = (request.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (host !== CANONICAL_HOST) {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    // Si además es una ruta de admin, sigue evaluando la auth abajo
    if (!(pathname.startsWith('/admin') && !pathname.startsWith('/admin/login'))) {
      return response
    }
  }

  // ── Protección JWT del panel de administración ────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_token')?.value
    if (!token || !(await verifyEdgeToken(token))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    // Si el host no es canónico + admin autenticado: agregar noindex igual
    if (host !== CANONICAL_HOST) {
      const response = NextResponse.next()
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Rutas de admin (ya existía)
    '/admin/:path*',
    // Todas las demás rutas para el chequeo de host
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
