/**
 * MALLA DE ENLAZADO — veredas
 * ===========================
 *
 * Qué vereda tiene página, en qué orden se enlazan y cuáles son vecinas.
 *
 * ---------------------------------------------------------------------------
 * 1. QUIÉN TIENE PÁGINA
 *
 * Por defecto, solo las que tienen contenido editorial en `veredas-data.ts`.
 * Las demás viven en la tabla para agrupar y filtrar, y NO entran en la malla:
 * una página cuyo único contenido es el inventario que ya está en el catálogo
 * no dice nada que la del municipio no diga. Es la página delgada de §1.3.
 *
 * EXCEPCIÓN AUTOMÁTICA: a partir de `UMBRAL_PROMOCION` propiedades, el listado
 * propio ya justifica la URL y deja de ser delgada. La vereda se promociona
 * sola —entra en la malla, en el sitemap y dispara IndexNow— y se degrada sola
 * si el inventario baja. Sin intervención manual, igual que los municipios.
 *
 * El umbral es de inventario, no de calidad: una vereda promocionada sigue sin
 * texto propio, y su página se limita a lo derivable. El contenido editorial
 * la mejora cuando llegue, no la habilita.
 *
 * ---------------------------------------------------------------------------
 * 2. ORDEN
 *
 * Las veredas de un municipio se ordenan por INVENTARIO, no alfabéticamente.
 * Quien llega buscando dónde comprar tiene delante primero donde hay algo que
 * comprar; el orden alfabético solo sirve a quien ya sabe el nombre.
 *
 * ---------------------------------------------------------------------------
 * 3. VECINAS
 *
 * «No encontré en Bulucaima, ¿qué hay al lado?» es la pregunta que más enlaza
 * el circuito hiperlocal. No hay dato de colindancia real —linderos oficiales—,
 * así que se aproxima por distancia geográfica entre los centroides declarados
 * en `veredas-data.ts`.
 *
 * Es una APROXIMACIÓN y se nombra como tal en la interfaz: «veredas cercanas»,
 * nunca «colindantes», que afirmaría una relación de lindero que no hemos
 * verificado. Una vereda sin coordenadas no propone vecinas en vez de proponer
 * cualquiera.
 *
 * TODO(titular): colindancia real del POT municipal, cuando llegue la lista de
 * las 27. Sustituye a la distancia, no la complementa.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'
import { getAllVeredasData, type VeredaData } from './veredas-data'

// La decisión de quién tiene página vive aparte y sin imports de runtime, para
// poder probarla con inventarios que hoy no existen. Ver ese archivo.
import { seleccionarPublicables } from './malla-veredas-seleccion'
import type { VeredaPublicable, FilaVereda } from './malla-veredas-seleccion'

export { UMBRAL_PROMOCION, seleccionarPublicables } from './malla-veredas-seleccion'
export type { VeredaPublicable, FilaVereda } from './malla-veredas-seleccion'

const leerVeredas = unstable_cache(
  async (): Promise<FilaVereda[]> => {
    const filas = await prisma.vereda.findMany({
      select: {
        slug: true, name: true,
        municipality: { select: { slug: true, name: true } },
        _count: { select: { properties: { where: { status: 'available' } } } },
      },
    })
    return filas.map(f => ({
      slug: f.slug,
      name: f.name,
      municipio_slug: f.municipality.slug,
      municipio_name: f.municipality.name,
      inventario: f._count.properties,
    }))
  },
  ['malla-veredas'],
  { revalidate: 3600, tags: ['enlaces', 'veredas'] },
)

/**
 * Veredas con página, ordenadas por inventario descendente.
 *
 * En `unstable_cache`, no en `cache()` de React: lo consultan la ruta de
 * vereda, el sitemap, el índice de enlaces y las páginas de municipio. Con
 * memoización por render serían decenas de consultas durante el prerender y el
 * pool de 5 volvería a morir con P2024. Ya pasó dos veces.
 *
 * Si la base no responde se cae a las editoriales, que viven en código: se
 * pierden las promocionadas, no la malla entera.
 */
export const veredasPublicables = cache(async (): Promise<VeredaPublicable[]> => {
  const editoriales = getAllVeredasData()
  try {
    return seleccionarPublicables(await leerVeredas(), editoriales)
  } catch (err) {
    console.warn('[malla] BD no disponible; solo veredas con contenido propio:', err instanceof Error ? err.message : err)
    return seleccionarPublicables(
      editoriales.map(v => ({
        slug: v.slug, name: v.name,
        municipio_slug: v.municipio_slug, municipio_name: v.municipio_name,
        inventario: 0,
      })),
      editoriales,
    )
  }
})

/** Veredas con página de un municipio, las que tienen inventario primero. */
export async function veredasDeMunicipio(municipioSlug: string): Promise<VeredaPublicable[]> {
  return (await veredasPublicables()).filter(v => v.municipio_slug === municipioSlug)
}

// ─── Vecinas ─────────────────────────────────────────────────────────────────

/** Distancia en kilómetros entre dos puntos (haversine). */
function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface VeredaCercana extends VeredaPublicable {
  distancia_km: number
}

/**
 * Veredas con página más cercanas a la dada, por distancia entre centroides.
 *
 * Devuelve lista vacía si la vereda de partida no tiene coordenadas: sin punto
 * de referencia, «cercana» sería una palabra sin contenido. Solo compara dentro
 * del mismo municipio; cruzar municipios convertiría el bloque en una lista de
 * sitios que el comprador no está considerando.
 */
export async function veredasCercanas(slug: string, limite = 3): Promise<VeredaCercana[]> {
  const todas = await veredasPublicables()
  const origen = todas.find(v => v.slug === slug)
  const geo = origen?.editorial
  if (!origen || !geo?.geo_lat || !geo?.geo_lng) return []

  return todas
    .filter(v => v.slug !== slug && v.municipio_slug === origen.municipio_slug)
    .map(v => {
      const g = v.editorial
      if (!g?.geo_lat || !g?.geo_lng) return null
      return { ...v, distancia_km: distanciaKm(geo.geo_lat!, geo.geo_lng!, g.geo_lat, g.geo_lng) }
    })
    .filter((v): v is VeredaCercana => v !== null)
    .sort((a, b) => a.distancia_km - b.distancia_km)
    .slice(0, limite)
}
