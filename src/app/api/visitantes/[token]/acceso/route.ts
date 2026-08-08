import { NextRequest, NextResponse } from 'next/server'
import {
  COOKIE_SESION,
  MAX_EDAD_COOKIE,
  buscarEnlaceUsable,
  crearSesion,
  verificarPin,
} from '@/lib/visitantes'
import { checkPinRateLimit } from '@/lib/visitantes-ratelimit'

// Intento de PIN del dueño. Detrás de esto hay cédulas, así que el orden de las
// comprobaciones importa:
//
//   1. Rate limit ANTES que nada. bcrypt.compare cuesta ~100ms a propósito; si
//      se dejara para el final, mil intentos serían también un ataque de carga.
//   2. Estado del enlace. Si no sirve —no existe, expiró, lo revocaron o quedó
//      bloqueado por intentos— la respuesta es SIEMPRE la misma. Distinguirlas
//      le diría a quien prueba tokens al azar cuándo acertó uno real.
//   3. Recién ahí se compara el PIN.
//
// El PIN no se escribe en ningún log, ni siquiera al fallar.

export const dynamic = 'force-dynamic'

const NO_DISPONIBLE = 'Este enlace no está disponible.'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { ok: dentroDelLimite } = await checkPinRateLimit(token, ip)
  if (!dentroDelLimite) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de volver a probar.' },
      { status: 429 }
    )
  }

  const enlace = await buscarEnlaceUsable(token)
  if (!enlace) return NextResponse.json({ error: NO_DISPONIBLE }, { status: 403 })

  let body: { pin?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  if (typeof body.pin !== 'string' || !body.pin) {
    return NextResponse.json({ error: 'Escribe el PIN.' }, { status: 400 })
  }

  const acertó = await verificarPin(enlace.id, enlace.pinHash, body.pin)
  if (!acertó) {
    return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESION, crearSesion(enlace.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_EDAD_COOKIE,
  })
  return res
}
