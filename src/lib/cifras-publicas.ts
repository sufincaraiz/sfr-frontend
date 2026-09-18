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
import { CIFRAS_PUBLICAS_KEY, DEFAULT_CIFRAS, withDefaultsCifras, type CifrasPublicas } from '@/lib/cifras-publicas-base'

export { CIFRAS_PUBLICAS_KEY, DEFAULT_CIFRAS, withDefaultsCifras, textoReputacion, type CifrasPublicas } from '@/lib/cifras-publicas-base'

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
