import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Rate limit para /api/visitas (registro público de visitas a inmuebles).
//
// Mismo PATRÓN que el limitador de Mac (src/lib/agent/ratelimit.ts) pero con
// contador PROPIO. Deliberadamente no se importa aquel módulo: comparte el
// prefijo "mac:ip", así que reutilizarlo haría que registrar una visita gastara
// la cuota del chat de Mac y viceversa. Aquí el prefijo es "visita:ip".
//
// Límite: 10 registros VÁLIDOS por IP en 10 minutos. El endpoint valida antes
// de consultar este límite, así que un dato mal escrito no gasta cuota. El
// margen está pensado para el caso real: un grupo que llega junto a ver una
// finca y se registra uno por uno desde el mismo hotspot o el wifi rural.
//
// SIN UPSTASH → respaldo en memoria, igual que en el módulo del agente: es un
// límite por instancia (cada lambda cuenta aparte) e imperfecto, pero preferible
// a dejar el formulario fuera de servicio.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_POR_IP = 10
const VENTANA = '10 m'
const VENTANA_MS = 10 * 60_000

let redis: Redis | null = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv()
  }
} catch (err) {
  console.error('[visitas] No se pudo inicializar Upstash Redis; se usará el respaldo en memoria:', err)
  redis = null
}

const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_POR_IP, VENTANA),
      prefix: 'visita:ip',
      analytics: false,
    })
  : null

// ─── Respaldo en memoria ─────────────────────────────────────────────────────

const memoria = new Map<string, { count: number; resetAt: number }>()

function limiteEnMemoria(clave: string, max: number): boolean {
  const ahora = Date.now()
  const entrada = memoria.get(clave)
  if (!entrada || ahora > entrada.resetAt) {
    memoria.set(clave, { count: 1, resetAt: ahora + VENTANA_MS })
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

/** `ok = false` cuando la IP superó el límite. Nunca lanza. */
export async function checkVisitaRateLimit(ip: string): Promise<{ ok: boolean }> {
  if (!ipLimiter) {
    if (!avisado) {
      console.warn('[visitas] Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN: usando el respaldo en memoria.')
      avisado = true
    }
    return { ok: limiteEnMemoria(`ip:${ip}`, MAX_POR_IP) }
  }

  try {
    const res = await ipLimiter.limit(ip)
    return { ok: res.success }
  } catch (err) {
    console.error('[visitas] Upstash falló; usando el respaldo en memoria:', err)
    return { ok: limiteEnMemoria(`ip:${ip}`, MAX_POR_IP) }
  }
}
