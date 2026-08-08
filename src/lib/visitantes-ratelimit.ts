import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit para el intento de PIN en /visitantes/<token>.
//
// Mismo PATRÓN que src/lib/visitas-ratelimit.ts y que el limitador de Mac, con
// contador PROPIO: el prefijo es "visitpin:". No se reutiliza ninguno de los
// otros — mezclarlos haría que adivinar PINs gastara la cuota del formulario
// público (o del chat) y viceversa.
//
// La clave es token+IP, no solo IP: dos dueños distintos detrás del mismo NAT
// rural no deben quitarse cuota entre sí, pero quien ataca UN enlace desde UNA
// IP se queda sin intentos rápido.
//
// Este límite es la primera barrera (por ventana de tiempo). La segunda es el
// contador acumulado `intentosFallidos` del propio enlace, que no se limpia con
// el paso del tiempo: juntas impiden tanto la ráfaga como el goteo paciente.
//
// SIN UPSTASH → respaldo en memoria. Es por instancia y por tanto más flojo,
// pero aquí el acumulado en base de datos sigue protegiendo aunque el limitador
// distribuido no esté.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_INTENTOS = 5
const VENTANA = '10 m'
const VENTANA_MS = 10 * 60_000

let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
} catch (err) {
  console.error('[visitantes] No se pudo inicializar Upstash Redis; se usará el respaldo en memoria:', err)
  redis = null
}

const pinLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_INTENTOS, VENTANA),
      prefix: 'visitpin',
      analytics: false,
    })
  : null

// ─── Respaldo en memoria ─────────────────────────────────────────────────────

const memoria = new Map<string, { count: number; resetAt: number }>()

function limiteEnMemoria(clave: string): boolean {
  const ahora = Date.now()
  const entrada = memoria.get(clave)
  if (!entrada || ahora > entrada.resetAt) {
    memoria.set(clave, { count: 1, resetAt: ahora + VENTANA_MS })
    if (memoria.size > 5_000) {
      for (const [k, v] of memoria) if (ahora > v.resetAt) memoria.delete(k)
    }
    return true
  }
  if (entrada.count >= MAX_INTENTOS) return false
  entrada.count++
  return true
}

let avisado = false

/** `ok = false` cuando ese token+IP agotó los intentos de PIN. Nunca lanza. */
export async function checkPinRateLimit(token: string, ip: string): Promise<{ ok: boolean }> {
  // El token es secreto: se usa un hash corto como clave para no dejarlo escrito
  // en Redis ni en la memoria del proceso.
  const clave = `${Buffer.from(token).toString('base64url').slice(0, 24)}:${ip}`

  if (!pinLimiter) {
    if (!avisado) {
      console.warn('[visitantes] Faltan credenciales de Upstash: usando el respaldo en memoria para el PIN.')
      avisado = true
    }
    return { ok: limiteEnMemoria(clave) }
  }

  try {
    const res = await pinLimiter.limit(clave)
    return { ok: res.success }
  } catch (err) {
    console.error('[visitantes] Upstash falló; usando el respaldo en memoria:', err)
    return { ok: limiteEnMemoria(clave) }
  }
}
