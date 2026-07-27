import { NextRequest, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'

// Endpoint TEMPORAL de diagnóstico: dice si el runtime ve Upstash y si el ping
// responde, para saber si /api/agent usa el limitador distribuido o el respaldo
// en memoria. NO expone valores de secretos, solo booleanos/metadatos.
// Protegido por ?key=SFR_DEBUG_2026 (sin la key exacta → 404). BORRAR tras usar.

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('key') !== 'SFR_DEBUG_2026') {
    notFound()
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  const urlExists = Boolean(url)
  const tokenExists = Boolean(token)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    urlExists,
    tokenExists,
    // true si no hay espacios/saltos al inicio o final (longitud === longitud recortada)
    urlTrimOk: urlExists ? url!.length === url!.trim().length : null,
    tokenTrimOk: tokenExists ? token!.length === token!.trim().length : null,
  }

  // Ping real a Upstash (sin exponer secretos ni stack)
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = Redis.fromEnv()
    await redis.ping()
    result.pingResult = 'OK'
  } catch (err) {
    result.pingError = err instanceof Error ? err.name : 'UnknownError'
  }

  return NextResponse.json(result)
}
