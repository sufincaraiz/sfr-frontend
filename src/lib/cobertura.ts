import { prisma } from '@/lib/prisma'
import { MUNICIPIOS_PROVINCIA } from '@/lib/datos-oficiales'
import { getTiposPropiedad } from '@/lib/property-types.server'
import { cargarEnlaces } from '@/lib/enlaces'
import { PUBLICABLE } from '@/lib/publicable'

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

// La condición de «municipio publicable» vive en @/lib/publicable, una sola vez.
// Antes estaba aquí Y en municipios.ts: coincidían, pero nada obligaba a que
// siguieran coincidiendo.

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
      where: PUBLICABLE,
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

export interface MunicipioDatos extends MunicipioRef {
  altitud_msnm:        number
  distancia_bogota_km: number
  tiempo_bogota_min:   number
  temp_min:            number
  temp_max:            number
}

/**
 * Municipios con página publicada, con sus datos verificables.
 *
 * Existe para que los bloques de contenido que hablan de «municipios vecinos»
 * o «el corredor» se generen desde la base en vez de escribirse a mano. El caso
 * que la motivó: la guía de inversión listaba cinco municipios fijos —San
 * Francisco, Nocaima, Sasaima, Vergara y Villeta— con adjetivos por descripción
 * («topografías fascinantes»). Dos problemas de doctrina a la vez: una lista de
 * municipios a mano (§1.3) y adjetivos donde §3 pide afirmaciones falsables.
 *
 * Los seis campos ya se exigen para publicar la página del municipio, así que
 * todo el que salga de aquí los tiene: se pueden mostrar sin comprobar nada.
 *
 * @param excluirSlug municipio a dejar fuera; sirve para «los OTROS municipios».
 */
export async function getMunicipiosConDatos(excluirSlug?: string): Promise<MunicipioDatos[]> {
  try {
    const rows = await prisma.municipality.findMany({
      where: {
        ...PUBLICABLE,
        ...(excluirSlug ? { slug: { not: excluirSlug } } : {}),
      },
      orderBy: [{ demand_score: 'desc' }, { name: 'asc' }],
      select: {
        slug: true, name: true, altitud_msnm: true,
        distancia_bogota_km: true, tiempo_bogota_min: true,
        temp_min: true, temp_max: true,
      },
    })
    // El filtro de Prisma ya garantiza los seis campos; el mapeo solo estrecha
    // los tipos de `number | null` a `number`.
    return rows.map(r => ({
      slug: r.slug,
      name: r.name,
      altitud_msnm:        r.altitud_msnm        as number,
      distancia_bogota_km: r.distancia_bogota_km as number,
      tiempo_bogota_min:   r.tiempo_bogota_min   as number,
      temp_min:            r.temp_min            as number,
      temp_max:            r.temp_max            as number,
    }))
  } catch (err) {
    console.warn('[cobertura] BD no disponible al derivar municipios con datos:', err instanceof Error ? err.message : err)
    return []
  }
}

/** ¿Este municipio tiene página publicada? Es la guarda contra enlazar a un 404. */
export async function municipioTienePagina(slug: string): Promise<boolean> {
  if (!slug) return false
  try {
    const n = await prisma.municipality.count({
      where: { slug, ...PUBLICABLE },
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
  // Delega en lib/enlaces.ts, que es la autoridad única sobre qué tiene página.
  // Antes resolvía por su cuenta con `municipioTienePagina()`: mismo criterio
  // que `getMunicipiosVisibles()` hoy, pero escrito dos veces. Cuando dos sitios
  // deciden lo mismo por separado, tarde o temprano dejan de coincidir.
  const enlaces = await cargarEnlaces()
  return enlaces.municipioConRespaldo(nombre, slug)
}
