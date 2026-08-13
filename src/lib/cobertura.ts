import { prisma } from '@/lib/prisma'
import { MUNICIPIOS_PROVINCIA } from '@/lib/datos-oficiales'
import { getTiposPropiedad } from '@/lib/property-types.server'

// ─────────────────────────────────────────────────────────────────────────────
// COBERTURA MUNICIPAL — las tres listas, derivadas, nunca escritas a mano.
//
// La doctrina AEO §1.2 distingue tres cosas que antes se confundían en un solo
// campo `oculto`. Son INDEPENDIENTES y salen de fuentes distintas:
//
//   1. areaServed  → los DOCE de la provincia. Constante geográfica.
//                    No consulta la base de datos. Declara dónde la empresa
//                    puede operar y captar, no dónde tiene inventario hoy.
//
//   2. Página publicada → se DERIVA de tener el contenido completo y no estar
//                    oculto. Un municipio sin contenido no tiene página aunque
//                    se marque visible.
//
//   3. Filtro del buscador → se DERIVA de una consulta de inventario activo.
//                    Un municipio entra o sale solo, según tenga propiedades.
//
// Las tres son ortogonales. El caso que lo demuestra es Albán: tiene una
// propiedad publicada (entra al filtro) pero cero campos de contenido (no tiene
// página). Un único campo de estado no podía representar eso.
//
// `oculto` sobrevive pero DEGRADADO: solo puede IMPEDIR la publicación, nunca
// forzarla. Es un freno manual, no un interruptor.
// ─────────────────────────────────────────────────────────────────────────────

/** Campos mínimos que definen «contenido propio y verificable» (doctrina §1.2). */
const CAMPOS_CONTENIDO = [
  'altitud_msnm',
  'distancia_bogota_km',
  'tiempo_bogota_min',
  'temp_min',
  'temp_max',
  'descripcion_seo',
] as const

/** Filtro Prisma que exige los seis campos poblados. Se usa en las consultas
 *  para que la derivación ocurra en la base y no en memoria. */
const CONTENIDO_COMPLETO = Object.fromEntries(
  CAMPOS_CONTENIDO.map(c => [c, { not: null }]),
) as Record<(typeof CAMPOS_CONTENIDO)[number], { not: null }>

// ─── 1. areaServed: los doce, constante ──────────────────────────────────────

/** Los doce municipios de la Provincia del Gualivá. No toca la base de datos. */
export function getAreaServida(): readonly string[] {
  return MUNICIPIOS_PROVINCIA
}

// ─── 2. Municipios con página publicada ──────────────────────────────────────

export interface MunicipioRef { slug: string; name: string }

/**
 * Municipios cuya página se publica: contenido completo Y no ocultos.
 *
 * `descripcion_seo` se comprueba además contra cadena vacía, porque un texto en
 * blanco pasa el `not: null` de Prisma pero no es contenido.
 */
export async function getMunicipiosConPagina(): Promise<MunicipioRef[]> {
  try {
    const rows = await prisma.municipality.findMany({
      where: { oculto: false, ...CONTENIDO_COMPLETO, NOT: { descripcion_seo: '' } },
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    })
    return rows
  } catch (err) {
    // Degradar a lista vacía en vez de tumbar el render: esto lo consume el
    // Footer, que aparece en TODAS las páginas.
    console.warn('[cobertura] BD no disponible al derivar municipios con página:', err instanceof Error ? err.message : err)
    return []
  }
}

/** ¿Este municipio tiene página publicada? Es la guarda contra enlazar a un 404. */
export async function municipioTienePagina(slug: string): Promise<boolean> {
  if (!slug) return false
  try {
    const n = await prisma.municipality.count({
      where: { slug, oculto: false, ...CONTENIDO_COMPLETO, NOT: { descripcion_seo: '' } },
    })
    return n > 0
  } catch {
    // Ante duda, NO enlazamos a la página: el catálogo filtrado siempre existe.
    return false
  }
}

// ─── 3. Municipios con inventario activo (filtro del buscador) ───────────────

/**
 * Municipios con al menos una propiedad disponible. Es la lista del filtro.
 * Nada que ver con tener página: Albán aparece aquí y no tiene página.
 */
export async function getMunicipiosConInventario(): Promise<MunicipioRef[]> {
  try {
    const rows = await prisma.municipality.findMany({
      where: { properties: { some: { status: 'available' } } },
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    })
    return rows
  } catch (err) {
    console.warn('[cobertura] BD no disponible al derivar municipios con inventario:', err instanceof Error ? err.message : err)
    return []
  }
}

// ─── 4. Tipos de inmueble con inventario activo (catálogo de servicios) ──────

/**
 * Tipos de inmueble que hoy tienen al menos una propiedad disponible, con su
 * plural. De aquí sale el `hasOfferCatalog` del JSON-LD.
 *
 * Misma lógica que las tres salidas de municipios de §1.3: la lista se deriva
 * del inventario en tiempo de consulta y nadie la mantiene. La que había estaba
 * escrita a mano en el marcado con cuatro tipos y omitía los apartamentos, que
 * llevaban tres unidades activas sin aparecer — la desincronización de siempre.
 *
 * Un tipo entra el día que entra su primera propiedad y sale cuando se vende la
 * última: declarar «venta de condominios» sin un solo condominio en catálogo es
 * la misma brecha entre lo declarado y lo publicado que §1.1 persigue.
 */
export async function getTiposConInventario(): Promise<{ slug: string; plural: string }[]> {
  try {
    const [grupos, tipos] = await Promise.all([
      prisma.property.groupBy({ by: ['type'], where: { status: 'available' } }),
      getTiposPropiedad({ incluirOcultos: true }),
    ])
    const plurales = new Map(tipos.map(t => [t.slug, t.plural]))
    const conStock = new Set(grupos.map(g => g.type))

    // Se recorre `tipos` y no `grupos` para conservar el orden editorial de la
    // tabla de tipos; los que no tienen inventario se caen solos.
    return tipos
      .filter(t => conStock.has(t.slug))
      .map(t => ({ slug: t.slug, plural: plurales.get(t.slug) ?? t.label }))
  } catch (err) {
    console.warn('[cobertura] BD no disponible al derivar tipos con inventario:', err instanceof Error ? err.message : err)
    return []
  }
}

// ─── Enlazado seguro ─────────────────────────────────────────────────────────

/**
 * A dónde enlazar cuando se nombra un municipio: a su página si está publicada,
 * y si no, al catálogo filtrado por ese municipio.
 *
 * Existe porque enlazar siempre a /municipios/<slug> produce 404 en los que no
 * tienen página —hoy Albán— y un enlace roto interno resta autoridad al dominio.
 */
export async function urlDeMunicipio(nombre: string, slug: string): Promise<string> {
  const publicada = await municipioTienePagina(slug)
  return publicada
    ? `/municipios/${slug}`
    : `/propiedades?municipio=${encodeURIComponent(nombre)}`
}
