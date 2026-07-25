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
// SIN UPSTASH → RESPALDO EN MEMORIA (no se cae el servicio). Antes fallaba
// cerrado y, al no estar configuradas UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN en Vercel, /api/agent respondía 429 a TODOS los
// visitantes: Mac quedaba mudo en la web. Un límite por instancia es imperfecto
// (cada lambda cuenta aparte) pero infinitamente mejor que no atender a nadie.
// En cuanto las variables existan, el limitador distribuido vuelve a mandar solo.
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

// ─── Respaldo en memoria (solo si Upstash no está disponible) ────────────────
// Ventana fija por proceso. En Vercel cada lambda tiene la suya, así que el
// límite efectivo es más laxo que el real; sirve para frenar abuso evidente
// desde una misma sesión o IP, no para un control estricto.

const memoria = new Map<string, { count: number; resetAt: number }>()

function limiteEnMemoria(clave: string, max: number, ventanaMs = 60_000): boolean {
  const ahora = Date.now()
  const entrada = memoria.get(clave)
  if (!entrada || ahora > entrada.resetAt) {
    memoria.set(clave, { count: 1, resetAt: ahora + ventanaMs })
    // Limpieza barata: evita que el Map crezca sin control en una lambda tibia.
    if (memoria.size > 5_000) {
      for (const [k, v] of memoria) if (ahora > v.resetAt) memoria.delete(k)
    }
    return true
  }
  if (entrada.count >= max) return false
  entrada.count++
  return true
}

let avisado = false

/**
 * Consulta ambos límites (por IP y por sesión). `ok = false` si CUALQUIERA excede.
 * Con Upstash configurado usa el limitador distribuido; si no, degrada al
 * respaldo en memoria para no dejar a Mac sin servicio.
 */
export async function checkRateLimit(
  ip: string,
  sessionId: string,
): Promise<{ ok: boolean }> {
  if (!ipLimiter || !sessionLimiter) {
    if (!avisado) {
      console.warn('[Mac] Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN: usando el respaldo en memoria (límite por instancia).')
      avisado = true
    }
    return { ok: limiteEnMemoria(`ip:${ip}`, 30) && limiteEnMemoria(`sess:${sessionId}`, 20) }
  }

  try {
    const [ipResult, sessionResult] = await Promise.all([
      ipLimiter.limit(ip),
      sessionLimiter.limit(sessionId),
    ])
    return { ok: ipResult.success && sessionResult.success }
  } catch (err) {
    // Redis caído o token inválido: mismo criterio, no tumbar el chat por esto.
    console.error('[Mac] Upstash falló; usando el respaldo en memoria:', err)
    return { ok: limiteEnMemoria(`ip:${ip}`, 30) && limiteEnMemoria(`sess:${sessionId}`, 20) }
  }
}
