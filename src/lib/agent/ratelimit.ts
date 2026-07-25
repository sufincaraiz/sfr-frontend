import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting DISTRIBUIDO para /api/agent (Upstash Redis).
// Reemplaza al Map en memoria del proceso, que no funciona en Vercel (cada lambda
// tiene su propia memoria) y usaba como clave el sessionId controlado por el cliente.
//
// Dos límites INDEPENDIENTES (sliding window, 60 s):
//   - Por IP:        30 req / 60 s   (prefijo "mac:ip")
//   - Por sessionId: 20 req / 60 s   (prefijo "mac:sess")
// Si CUALQUIERA se excede → { ok: false }.
//
// FALLA CERRADO: si faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN,
// no se instancia el cliente y checkRateLimit devuelve { ok: false } (nunca abre).
// ─────────────────────────────────────────────────────────────────────────────

// Cliente Redis instanciado UNA sola vez a nivel de módulo: en serverless el
// módulo se reutiliza entre invocaciones de la misma instancia. Redis.fromEnv()
// lee UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN del entorno.
// Envuelto en try/catch: si faltan o están mal las vars, degradamos a null (y
// checkRateLimit devuelve { ok:false }) — NUNCA lanzamos al importar (evita 500).
let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
} catch (err) {
  console.error('[Mac] No se pudo inicializar Upstash Redis; el rate limit fallará cerrado:', err)
  redis = null
}

const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'mac:ip',
      analytics: false,
    })
  : null

const sessionLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      prefix: 'mac:sess',
      analytics: false,
    })
  : null

/**
 * Consulta ambos límites (por IP y por sesión). `ok = false` si CUALQUIERA excede.
 * FALLA CERRADO: si Upstash no está configurado, devuelve `{ ok: false }`.
 */
export async function checkRateLimit(
  ip: string,
  sessionId: string,
): Promise<{ ok: boolean }> {
  if (!ipLimiter || !sessionLimiter) {
    console.error('[Mac] Rate limiter no configurado: faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN')
    return { ok: false }
  }
  const [ipResult, sessionResult] = await Promise.all([
    ipLimiter.limit(ip),
    sessionLimiter.limit(sessionId),
  ])
  return { ok: ipResult.success && sessionResult.success }
}
