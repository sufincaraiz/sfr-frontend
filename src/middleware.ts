import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { roleCanAccessAdminPath, roleHome } from '@/lib/permissions'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-me'
)

const CANONICAL_HOST = 'www.sufincaraiz.com'

/** Verifica el JWT en el edge y devuelve el rol; null si el token es inválido. */
async function verifyEdgeRole(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return typeof payload.role === 'string' ? payload.role : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Bloquea indexación de hosts no canónicos (*.vercel.app, previews, etc.) ─
  // Condición: si el host NO es exactamente www.sufincaraiz.com → noindex
  const host = (request.headers.get('host') ?? '').split(':')[0]?.toLowerCase() ?? ''
  if (host !== CANONICAL_HOST) {
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    // Si además es una ruta de admin, sigue evaluando la auth abajo
    if (!(pathname.startsWith('/admin') && !pathname.startsWith('/admin/login'))) {
      return response
    }
  }

  // ── Protección del panel de administración (autenticación + rol) ──────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = request.cookies.get('admin_token')?.value
    const role = token ? await verifyEdgeRole(token) : null
    // 1) Sin token válido → al login
    if (!role) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    // 2) Token válido pero el rol no tiene acceso a esta ruta → a su propia home
    //    (mata el "escribir la URL a mano"). El chequeo de `activo` se hace en el
    //    servidor (requireSession), porque Prisma no corre en el edge.
    if (!roleCanAccessAdminPath(role, pathname)) {
      return NextResponse.redirect(new URL(roleHome(role), request.url))
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
