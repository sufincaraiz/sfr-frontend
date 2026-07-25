import { prisma } from '@/lib/prisma'

// Forma de un municipio para las páginas públicas (misma que el antiguo MunicipioData,
// ahora servida desde la BD + tour360_url). El contenido se edita desde /admin/municipios.
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

/** Un municipio público por slug. Devuelve null si no existe o está oculto. */
export async function getMunicipio(slug: string): Promise<Municipio | null> {
  const m = await prisma.municipality.findFirst({ where: { slug, oculto: false } })
  return m ? mapMunicipio(m) : null
}

/** Todos los municipios VISIBLES (no ocultos), ordenados por demanda y nombre. */
export async function getMunicipiosVisibles(): Promise<Municipio[]> {
  const rows = await prisma.municipality.findMany({
    where: { oculto: false },
    orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
  })
  return rows.map(mapMunicipio)
}
