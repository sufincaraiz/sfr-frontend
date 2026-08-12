import { prisma } from '@/lib/prisma'

// Forma de un municipio para las páginas públicas. El contenido vive en la base
// y se edita desde /admin/municipios; antes estaba escrito a mano en
// lib/municipios-data.ts, que quedó sin uso y se eliminó.
export interface Municipio {
  slug: string
  name: string
  provincia: string
  distancia_bogota_km: number
  tiempo_bogota_min: number
  altitud_msnm: number
  temperatura_c: { min: number; max: number }
  descripcion_seo: string
  meta_description: string | null
  historia: string
  clima: string
  turismo: string
  inversion: string
  og_image: string | null
  geo_lat: number
  geo_lng: number
  wikipedia_url: string
  faqs: { question: string; answer: string }[]
  tour360_url: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMunicipio(m: any): Municipio {
  return {
    slug: m.slug,
    name: m.name,
    provincia: m.provincia ?? 'Gualivá',
    distancia_bogota_km: m.distancia_bogota_km ?? 0,
    tiempo_bogota_min: m.tiempo_bogota_min ?? 0,
    altitud_msnm: m.altitud_msnm ?? 0,
    temperatura_c: { min: m.temp_min ?? 0, max: m.temp_max ?? 0 },
    descripcion_seo: m.descripcion_seo ?? '',
    meta_description: m.meta_description ?? null,
    historia: m.historia ?? '',
    clima: m.clima ?? '',
    turismo: m.turismo ?? '',
    inversion: m.inversion ?? '',
    og_image: m.og_image ?? null,
    geo_lat: m.geo_lat ?? 0,
    geo_lng: m.geo_lng ?? 0,
    wikipedia_url: m.wikipedia_url ?? '',
    faqs: Array.isArray(m.faqs) ? (m.faqs as { question: string; answer: string }[]) : [],
    tour360_url: m.tour360_url ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLICACIÓN DE PÁGINAS DE MUNICIPIO (doctrina AEO §1.2)
//
// Una página se publica si el municipio tiene CONTENIDO COMPLETO y no está
// oculto. Las dos condiciones, no una:
//
//   • El contenido manda. Un municipio sin altitud, clima, distancia ni
//     descripción no tiene página aunque se marque visible — sería una página
//     delgada, y una página vacía resta autoridad al dominio entero.
//   • `oculto` quedó DEGRADADO: solo puede IMPEDIR la publicación, nunca
//     forzarla. Es un freno manual, no un interruptor.
//
// La lista para el FILTRO del buscador no sale de aquí: se deriva del inventario
// activo en @/lib/cobertura. Son cosas independientes.
// ─────────────────────────────────────────────────────────────────────────────

/** Los seis campos que definen contenido propio y verificable. */
const CONTENIDO_COMPLETO = {
  altitud_msnm:        { not: null },
  distancia_bogota_km: { not: null },
  tiempo_bogota_min:   { not: null },
  temp_min:            { not: null },
  temp_max:            { not: null },
  descripcion_seo:     { not: null },
} as const

/** Condición completa de publicación: contenido + no oculto + descripción no vacía. */
const PUBLICABLE = {
  oculto: false,
  ...CONTENIDO_COMPLETO,
  NOT: { descripcion_seo: '' },
} as const

/** Un municipio con página publicada, por slug. null si no existe, no tiene
 *  contenido completo, está oculto o la BD no responde. */
export async function getMunicipio(slug: string): Promise<Municipio | null> {
  // También lo consumen las páginas de veredas (params estáticos que SÍ se prerenderizan)
  // para mostrar el municipio padre. Si la BD no responde en build, devolvemos null en
  // vez de tumbar el prerender.
  try {
    const m = await prisma.municipality.findFirst({ where: { slug, ...PUBLICABLE } })
    return m ? mapMunicipio(m) : null
  } catch (err) {
    console.warn(`[getMunicipio ${slug}] BD no disponible; devolviendo null:`, err instanceof Error ? err.message : err)
    return null
  }
}

/** Municipios con PÁGINA PUBLICADA, ordenados por demanda y nombre.
 *  Deriva de contenido completo + no oculto; nunca de una lista escrita a mano. */
export async function getMunicipiosVisibles(): Promise<Municipio[]> {
  // Lo usa el Footer (en TODAS las páginas), el sitemap y el listado. Si la BD no
  // responde (p. ej. Railway en frío durante el build de Vercel), degradamos a lista
  // vacía en vez de tumbar el render de cada página estática.
  try {
    const rows = await prisma.municipality.findMany({
      where: PUBLICABLE,
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
    })
    return rows.map(mapMunicipio)
  } catch (err) {
    console.warn('[getMunicipiosVisibles] BD no disponible; devolviendo lista vacía:', err instanceof Error ? err.message : err)
    return []
  }
}
