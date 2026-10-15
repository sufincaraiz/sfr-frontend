import { prisma } from '@/lib/prisma'
import { hoyEnColombia } from '@/lib/dia-colombia'

/**
 * Base de conocimiento de Mac: fichas que el equipo carga en /admin/mac
 * (promociones, formas de pago, preguntas frecuentes, políticas) y que se
 * inyectan en su prompt en cada conversación. Permite actualizar lo que Mac
 * sabe SIN tocar código ni desplegar.
 */

const CACHE_MS = 60_000
let cache: { texto: string; expira: number } | null = null

export interface FichaMac {
  id: string
  titulo: string
  contenido: string
  categoria: string
  activo: boolean
  orden: number
  vigente_hasta: Date | null
  updated_at: Date
}

/**
 * Fichas activas y vigentes, en orden de prioridad.
 *
 * ⚠ LA VIGENCIA ES UN DÍA, Y SE COMPARABA CONTRA UN INSTANTE.
 *
 * `vigente_hasta` sale de un `<input type="date">`: es un DÍA PURO, y su columna
 * es `DATE` desde la migración del 2026-10-15. El filtro era `{ gte: new Date() }`
 * —un instante—, y al comparar `date` con `timestamp` Postgres promueve el día a
 * su medianoche. Resultado: una ficha vigente «hasta el 15» dejaba de usarse
 * desde las 19:00 del 14 en Colombia, porque a esa hora en UTC ya es el 15 a las
 * 00:00 y `2026-10-15 >= 2026-10-15 00:00` deja de cumplirse en cuanto el reloj
 * avanza un minuto. Perdía casi dos días, no cinco horas.
 *
 * Ahora se compara DÍA contra DÍA: la medianoche UTC del día de hoy en Colombia,
 * que es exactamente lo que guarda una columna `DATE`. Así el último día de
 * vigencia se incluye entero, que es lo que entiende quien escribe «hasta el
 * 15» en el formulario.
 */
export async function fichasActivas(): Promise<FichaMac[]> {
  const hoy = new Date(`${hoyEnColombia()}T00:00:00Z`)
  return prisma.macKnowledge.findMany({
    where: {
      activo: true,
      OR: [{ vigente_hasta: null }, { vigente_hasta: { gte: hoy } }],
    },
    orderBy: [{ orden: 'asc' }, { updated_at: 'desc' }],
  })
}

/**
 * Bloque de texto listo para anexar al system prompt. Cadena vacía si no hay
 * fichas cargadas. Cacheado 60 s para no consultar la BD en cada mensaje.
 */
export async function bloqueConocimiento(): Promise<string> {
  if (cache && cache.expira > Date.now()) return cache.texto

  let texto = ''
  try {
    const fichas = await fichasActivas()
    if (fichas.length > 0) {
      const cuerpo = fichas
        .map(f => `## ${f.titulo}${f.categoria && f.categoria !== 'General' ? ` (${f.categoria})` : ''}\n${f.contenido.trim()}`)
        .join('\n\n')
      texto =
        '\n\n# Información oficial de Su Finca Raíz (cargada por el equipo)\n' +
        'Esta información es VERAZ, ACTUAL y APROBADA por la empresa. Si el cliente pregunta\n' +
        'algo que está aquí — incluidas promociones o condiciones comerciales — RESPÓNDELE con\n' +
        'esta información, con naturalidad y seguridad: aquí NO aplica la regla de derivar al\n' +
        'especialista por no saber, porque sí sabes. Puedes añadir que el especialista confirma\n' +
        'los detalles finales. Solo lo que NO esté aquí ni en tus herramientas se escala.\n\n' +
        cuerpo
    }
  } catch (err) {
    // La BD puede fallar; Mac debe seguir respondiendo con su prompt base.
    console.error('[Mac] No se pudo cargar la base de conocimiento:', err)
    return ''
  }

  cache = { texto, expira: Date.now() + CACHE_MS }
  return texto
}

/** Fuerza la recarga tras editar en /admin/mac (el cambio se ve al instante). */
export function invalidarConocimiento(): void {
  cache = null
}
