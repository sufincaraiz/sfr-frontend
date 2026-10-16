import 'server-only'
import { Redis } from '@upstash/redis'
import { diaEnColombia, hoyEnColombia } from '@/lib/dia-colombia'

/**
 * P2024 — EL CONTADOR DE «POOL AGOTADO» QUE PUEDE PONERSE ROJO SOLO
 * =================================================================
 *
 * `verificar-build.mjs` detecta P2024 leyendo el log del build, y **no corre en
 * Vercel**: se lanza a sí mismo `npm run build`, así que sería recursión. Se
 * consideró envolver `next build` para cerrar ese hueco y se descartó: envolver
 * el comando de build es la línea de más riesgo del proyecto —un fallo del
 * envoltorio son cero despliegues— y compra detección en tiempo de BUILD de un
 * problema que se manifiesta sobre todo en EJECUCIÓN.
 *
 * Esto es la otra mitad, la que el build no puede dar: la señal en producción.
 *
 * ⚠ Y EL CONTADOR NO PUEDE VIVIR EN POSTGRES. Es el mismo razonamiento que el
 * candado del aviso de `redis-salud.ts`, al revés y por eso mismo: ese candado
 * vive en Postgres porque existe para cuando Redis no responde. Este vive en
 * Redis porque existe para cuando **Postgres** se queda sin conexiones:
 * guardarlo en la base que acaba de agotar su pool sería pedirle la hora al
 * reloj que se paró.
 *
 * Si Redis tampoco está, se escribe en el log y se sigue. Nada de este módulo
 * puede tumbar a quien lo llama: el P2024 ya es el problema, y un fallo del
 * contador encima lo taparía.
 */

const PREFIJO = 'p2024'
/** Un mes de historia es suficiente para ver un patrón; más no se consulta. */
const DIAS_RETENCION = 30

function clienteOpcional(): Redis | null {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
    return Redis.fromEnv()
  } catch {
    return null
  }
}

/** La clave del día de COLOMBIA: un conteo por día natural del negocio. */
const claveDe = (dia: string) => `${PREFIJO}:${dia}`

/**
 * Suma uno al contador del día. Devuelve `true` si quedó registrado.
 *
 * No lanza nunca. La llama la extensión de Prisma en `lib/prisma.ts`, dentro
 * del camino de error: lo último que puede hacer es añadir una excepción.
 */
export async function registrarPoolAgotado(detalle?: string): Promise<boolean> {
  const dia = hoyEnColombia()
  console.error(
    `[P2024] pool de conexiones agotado (${dia})${detalle ? ` — ${detalle}` : ''}. ` +
    'Casi siempre significa consultas de más POR PÁGINA o por petición.',
  )
  const redis = clienteOpcional()
  if (!redis) return false
  try {
    const clave = claveDe(dia)
    await redis.incr(clave)
    await redis.expire(clave, DIAS_RETENCION * 24 * 60 * 60)
    return true
  } catch (err) {
    console.warn('[P2024] no se pudo registrar el contador:', err instanceof Error ? err.message : err)
    return false
  }
}

export interface ConteoPoolAgotado {
  /** Día de Colombia → cuántos P2024. Solo los días con al menos uno. */
  porDia: Array<{ dia: string; veces: number }>
  total: number
  /** `null` cuando Redis no respondió: no es lo mismo que «cero». */
  consultado: boolean
}

/**
 * Lo ocurrido en los últimos `dias` días de Colombia.
 *
 * ⚠ «0 porque no hubo» y «0 porque no pude preguntar» son cosas distintas, y
 * por eso `consultado` viaja en el resultado. Es la misma lección que el cero
 * del cron de retención sobre una tabla vacía.
 */
export async function conteoPoolAgotado(dias = 7): Promise<ConteoPoolAgotado> {
  const redis = clienteOpcional()
  if (!redis) return { porDia: [], total: 0, consultado: false }

  const ahora = Date.now()
  const claves: string[] = []
  for (let i = 0; i < dias; i++) {
    claves.push(claveDe(diaEnColombia(new Date(ahora - i * 86_400_000))))
  }
  try {
    const valores = await redis.mget<(number | null)[]>(...claves)
    const porDia = claves
      .map((c, i) => ({ dia: c.slice(PREFIJO.length + 1), veces: Number(valores[i] ?? 0) }))
      .filter(x => x.veces > 0)
    return { porDia, total: porDia.reduce((a, b) => a + b.veces, 0), consultado: true }
  } catch (err) {
    console.warn('[P2024] no se pudo leer el contador:', err instanceof Error ? err.message : err)
    return { porDia: [], total: 0, consultado: false }
  }
}
