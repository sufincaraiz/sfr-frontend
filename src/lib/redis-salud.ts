import 'server-only'
import { Prisma } from '@prisma/client'
import { Redis } from '@upstash/redis'
import { prisma } from '@/lib/prisma'
import { enviarAlertaLeadWhatsApp } from '@/lib/whatsapp'

/**
 * SALUD DE UPSTASH REDIS — latido y aviso
 * =======================================
 *
 * Dos problemas distintos, los dos de visibilidad:
 *
 * 1. POCO USO. Upstash archiva una base sin tráfico. Los únicos caminos que
 *    tocan Redis son de visitante —chat de Mac, PIN del dueño, registro de
 *    visitas— y con 25 comandos en semanas la base entra en «inactiva». El
 *    latido del cron diario la mantiene viva con un comando al día.
 *
 * 2. EL RESPALDO MUDO. Los tres limitadores fallan ABIERTO a propósito: si
 *    Redis no responde, pasan a un contador en memoria. Esa decisión es
 *    correcta —en julio fallar cerrado dejó a Mac mudo y respondiendo 429 a
 *    todos los visitantes— pero nadie se enteraba de que el límite distribuido
 *    había dejado de existir. Ahora avisa, una vez al día.
 *
 * ⚠ EL CANDADO DEL AVISO VIVE EN POSTGRES, NO EN REDIS. Es lo único coherente:
 * el aviso existe justamente para cuando Redis no responde. Guardarlo en Redis
 * sería pedirle la hora al reloj que se paró. Y tampoco puede vivir en memoria
 * del proceso: en Vercel cada lambda tendría su propio «ya avisé» y el titular
 * recibiría un mensaje por instancia.
 *
 * Nada de este módulo puede tumbar a quien lo llama: todo va envuelto y, si
 * falla, se escribe en el log y se sigue.
 */

const CLAVE_ESTADO = 'estado-redis'
const HORAS_ENTRE_AVISOS = 24

/** Cliente opcional: null si faltan las credenciales. Nunca lanza al importar. */
function clienteOpcional(): Redis | null {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
    return Redis.fromEnv()
  } catch {
    return null
  }
}

export interface ResultadoLatido {
  escrito: boolean
  /** Por qué no se escribió, cuando no se escribió. */
  motivo?: string
}

/**
 * Marca de vida en Redis. Caduca a los 7 días: si el cron deja de correr, la
 * clave desaparece sola y no queda basura afirmando que todo va bien.
 *
 * FALLA EN SILENCIO para quien llama (el cron no puede caerse por esto), pero
 * devuelve el motivo para que el cron lo registre y pueda avisar.
 */
export async function latidoRedis(): Promise<ResultadoLatido> {
  const redis = clienteOpcional()
  if (!redis) return { escrito: false, motivo: 'faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN' }
  try {
    await redis.set('vigilancia:ultimo', new Date().toISOString(), { ex: 7 * 24 * 60 * 60 })
    return { escrito: true }
  } catch (err) {
    return { escrito: false, motivo: err instanceof Error ? err.message : 'error desconocido' }
  }
}

interface EstadoRedis {
  ultimo_aviso?: string
  ultimo_origen?: string
  avisos?: number
}

/**
 * Avisa UNA VEZ AL DÍA de que un limitador cayó al respaldo en memoria.
 *
 * El candado es un `updateMany` condicionado por `updated_at`: solo una de las
 * lambdas concurrentes logra actualizar la fila, y solo esa envía el mensaje.
 * Sin esa condición, diez peticiones simultáneas con Redis caído serían diez
 * mensajes de WhatsApp.
 *
 * @param origen quién lo detectó: «Mac», «PIN del dueño», «registro de visitas», «cron»
 */
export async function avisarRespaldoEnMemoria(origen: string, detalle?: string): Promise<boolean> {
  try {
    const limite = new Date(Date.now() - HORAS_ENTRE_AVISOS * 60 * 60 * 1000)
    const previo = await prisma.pageContent.findUnique({ where: { key: CLAVE_ESTADO }, select: { id: true, data: true, updated_at: true } })

    const estado = (previo?.data ?? {}) as EstadoRedis
    const nuevo: EstadoRedis = {
      ultimo_aviso: new Date().toISOString(),
      ultimo_origen: origen,
      avisos: (estado.avisos ?? 0) + 1,
    }

    if (!previo) {
      await prisma.pageContent.create({ data: { key: CLAVE_ESTADO, data: nuevo as unknown as Prisma.InputJsonObject } })
    } else {
      // Gana la primera lambda que consiga pasar la condición de tiempo.
      const r = await prisma.pageContent.updateMany({
        where: { key: CLAVE_ESTADO, updated_at: { lt: limite } },
        data: { data: nuevo as unknown as Prisma.InputJsonObject },
      })
      if (r.count === 0) return false // otra instancia ya avisó hoy
    }

    console.warn(`[redis-salud] Limitador en respaldo de memoria (${origen}): ${detalle ?? 'sin detalle'}. Avisando por WhatsApp.`)
    await enviarAlertaLeadWhatsApp(
      '⚠ LÍMITE DE PETICIONES SIN REDIS',
      'revisar Upstash',
      `El limitador de ${origen} está usando el respaldo en memoria: Upstash no responde. ` +
      `El sitio sigue funcionando, pero el límite ya no es compartido entre instancias. Revisa la base en Upstash.`,
    )
    return true
  } catch (err) {
    // Ni el aviso ni su candado pueden romper una petición de visitante.
    console.error('[redis-salud] no se pudo avisar del respaldo en memoria:', err)
    return false
  }
}
