// ─────────────────────────────────────────────────────────────────────────────
// CIFRAS PÚBLICAS EDITABLES — reputación de Google (calificación + reseñas)
// =============================================================================
//
// Estas dos cifras suben solas con el tiempo (llegan reseñas nuevas). Tenerlas
// escritas a mano obligaba a un despliegue por cada opinión nueva, así que
// viven en una fila de `PageContent` (key `cifras-publicas`) editable desde el
// dashboard, con el mismo patrón que `/registro-visita` y `/propuesta`.
//
// FUENTE ÚNICA (doctrina AEO §2): esta cifra aparece en el home, en Nosotros,
// en el llms.txt y en las respuestas de Mac. Si un sitio dijera 38 y otro 26, el
// modelo deja de confiar en TODAS las cifras del dominio. Por eso NADIE hornea
// el número: todos leen `cargarCifras()` y componen el texto con
// `textoReputacion()`. El `DATOS_OFICIALES` estático es el respaldo de compilación
// (y el valor por defecto cuando la fila aún no existe), no una segunda verdad.
//
// ⚠ La calificación NO se marca como aggregateRating en JSON-LD: Google prohíbe
// el marcado de reseñas autorreferenciales y arriesga los resultados
// enriquecidos de todo el dominio. Va como TEXTO VISIBLE, siempre con su fuente.
// ─────────────────────────────────────────────────────────────────────────────
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'

export interface CifrasPublicas {
  /** Calificación media en Google Business Profile, 0–5. */
  calificacionGoogle: number
  /** Número de opiniones en Google Business Profile. Entero ≥ 0. */
  resenasGoogle: number
  /** Fecha de corte de la cifra, formato AAAA-MM. */
  fechaCorteReputacion: string
}

export const CIFRAS_PUBLICAS_KEY = 'cifras-publicas'

// Valor por defecto = verdad actual, confirmada por el titular. Es lo que se
// sirve mientras no exista la fila y el respaldo si la base no responde. Un solo
// literal de cada cifra en todo el repo: sale de DATOS_OFICIALES.
export const DEFAULT_CIFRAS: CifrasPublicas = {
  calificacionGoogle:   DATOS_OFICIALES.calificacionGoogle,
  resenasGoogle:        DATOS_OFICIALES.resenasGoogle,
  fechaCorteReputacion: DATOS_OFICIALES.fechaCorteReputacion,
}

/**
 * Normaliza y VALIDA lo que llega de la base o del formulario. Un valor fuera de
 * rango no se guarda: cae al valor por defecto. Así una fila corrupta nunca
 * publica una calificación de 7,0 ni un número de reseñas negativo.
 */
export function withDefaultsCifras(data?: Partial<CifrasPublicas> | null): CifrasPublicas {
  const d = DEFAULT_CIFRAS
  if (!data) return d
  const calif =
    typeof data.calificacionGoogle === 'number' &&
    data.calificacionGoogle >= 0 && data.calificacionGoogle <= 5
      ? data.calificacionGoogle
      : d.calificacionGoogle
  const resenas =
    Number.isInteger(data.resenasGoogle) && (data.resenasGoogle as number) >= 0
      ? (data.resenasGoogle as number)
      : d.resenasGoogle
  const fecha =
    typeof data.fechaCorteReputacion === 'string' &&
    /^\d{4}-\d{2}$/.test(data.fechaCorteReputacion)
      ? data.fechaCorteReputacion
      : d.fechaCorteReputacion
  return { calificacionGoogle: calif, resenasGoogle: resenas, fechaCorteReputacion: fecha }
}

/**
 * Cómo se cita SIEMPRE la reputación: nunca el número solo, siempre «X sobre N
 * opiniones en Google». Antes esto era un string horneado (`googleRatingTexto`)
 * con el 26 dentro; ahora se compone en el momento con la cifra viva, para que
 * el número no pueda quedar viejo en un sitio y fresco en otro.
 */
export function textoReputacion(
  c: Pick<CifrasPublicas, 'calificacionGoogle' | 'resenasGoogle'>,
): string {
  const calif = c.calificacionGoogle.toFixed(1).replace('.', ',')
  return `${calif} sobre ${c.resenasGoogle} opiniones en Google`
}

/**
 * Lee la fila de cifras editables y la superpone sobre el respaldo. Cacheada por
 * render con `cache()`: el home la pide para dos componentes (StatsSection y
 * AboutUs) y solo se consulta la base una vez. Nunca lanza: si la BD cae,
 * devuelve el respaldo estático y el sitio sigue mostrando cifras correctas.
 */
export const cargarCifras = cache(async (): Promise<CifrasPublicas> => {
  try {
    const row = await prisma.pageContent.findUnique({ where: { key: CIFRAS_PUBLICAS_KEY } })
    return withDefaultsCifras((row?.data as Partial<CifrasPublicas> | undefined) ?? null)
  } catch (err) {
    console.warn('[cifras-publicas] BD no disponible, se usa el respaldo:', err instanceof Error ? err.message : err)
    return DEFAULT_CIFRAS
  }
})
