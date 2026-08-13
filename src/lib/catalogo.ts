import { prisma } from '@/lib/prisma'
import type { Property } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO — la consulta del listado, en un solo sitio.
//
// Existe porque el catálogo se sirve ahora desde TRES rutas:
//
//   /propiedades                      (con filtros por querystring)
//   /propiedades/[municipio]          ruta limpia
//   /propiedades/[tipo]/[municipio]   ruta limpia
//
// Tres copias de la misma consulta serían tres copias que pueden divergir, que
// es el mismo argumento por el que las listas de municipios se derivan y no se
// escriben. La ruta cambia; lo que se consulta, no.
//
// Las rutas limpias son las CANÓNICAS. La versión con querystring sigue
// existiendo porque los filtros interactivos la necesitan, pero declara su
// canonical apuntando a la ruta limpia equivalente: son la misma vista y un
// motor no debe indexar las dos.
// ─────────────────────────────────────────────────────────────────────────────

export const LIMIT = 12

export interface FiltroCatalogo {
  /** Slug del tipo de inmueble («finca», «lote»). */
  tipo?:      string
  /** NOMBRE del municipio («La Vega»), no su slug: es lo que guarda la relación. */
  municipio?: string
  maxPrecio?: string
  page?:      number
}

export interface ResultadoCatalogo {
  properties: Property[]
  total:      number
  page:       number
  pages:      number
}

export async function fetchPropiedades(f: FiltroCatalogo): Promise<ResultadoCatalogo> {
  const page = Math.max(1, f.page ?? 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'available' }

  if (f.tipo && f.tipo !== 'todos')            where.type = f.tipo
  if (f.maxPrecio)                              where.price_cop = { lte: BigInt(f.maxPrecio) }
  if (f.municipio && f.municipio !== 'todos') {
    where.municipality = { name: { contains: f.municipio, mode: 'insensitive' } }
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip: (page - 1) * LIMIT,
        take: LIMIT,
        orderBy: [{ published_at: 'desc' }],
        include: {
          municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
          media:        { orderBy: { order: 'asc' }, take: 6 },
        },
      }),
      prisma.property.count({ where }),
    ])

    return { properties: rows.map(serializar), total, page, pages: Math.ceil(total / LIMIT) }
  } catch (err) {
    console.warn('[catalogo] BD no disponible:', err instanceof Error ? err.message : err)
    return { properties: [], total: 0, page, pages: 0 }
  }
}

/** Serializa BigInt y fechas a lo que espera el tipo `Property` del cliente. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializar(r: any): Property {
  return {
    id:                r.id,
    slug:              r.slug,
    type:              r.type as Property['type'],
    transaction_type: 'venta' as const,
    municipality_id:   r.municipality_id,
    vereda_id:         r.vereda_id,
    address_visible:   r.address_visible,
    price_cop:         Number(r.price_cop),
    area_lot_m2:       r.area_lot_m2,
    area_built_m2:     r.area_built_m2,
    bedrooms:          r.bedrooms,
    bathrooms:         r.bathrooms,
    parking:           r.parking,
    year_built:        r.year_built,
    status:            r.status as Property['status'],
    geo_lat:           r.geo_lat,
    geo_lng:           r.geo_lng,
    published_at:      r.published_at.toISOString(),
    updated_at:        r.updated_at.toISOString(),
    title:             r.title ?? undefined,
    short_description: r.short_description ?? undefined,
    meta_title:        r.meta_title ?? undefined,
    meta_description:  r.meta_description ?? undefined,
    municipality:      r.municipality ?? undefined,
    media:             r.media as Property['media'],
  }
}

// ─── Resolución de slugs de URL ──────────────────────────────────────────────

/**
 * Resuelve el slug de un municipio a su nombre real.
 *
 * Devuelve `null` si no existe, y quien llama debe responder 404. Es la guarda
 * que impide que `/propiedades/cualquier-cosa` renderice un catálogo vacío con
 * un `<h1>` inventado: una ruta que acepta cualquier segmento fabrica páginas
 * infinitas sin contenido, y eso resta autoridad al dominio entero.
 */
export async function resolverMunicipio(slug: string): Promise<{ slug: string; name: string } | null> {
  if (!slug) return null
  try {
    return await prisma.municipality.findUnique({
      where:  { slug },
      select: { slug: true, name: true },
    })
  } catch (err) {
    console.warn('[catalogo] BD no disponible al resolver municipio:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Resuelve un NOMBRE de municipio a su slug. Lo necesita el canonical de la
 * vista con filtros, donde el municipio viaja por nombre («La Vega») y hay que
 * traducirlo a la ruta limpia («la-vega»).
 */
export async function municipioPorNombre(nombre: string): Promise<{ slug: string; name: string } | null> {
  if (!nombre) return null
  try {
    return await prisma.municipality.findFirst({
      where:  { name: { equals: nombre, mode: 'insensitive' } },
      select: { slug: true, name: true },
    })
  } catch (err) {
    console.warn('[catalogo] BD no disponible al resolver municipio por nombre:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Resuelve el slug de un tipo de inmueble. `null` si no existe → 404. */
export async function resolverTipo(slug: string): Promise<{ slug: string; label: string; plural: string } | null> {
  if (!slug) return null
  try {
    const t = await prisma.tipoPropiedad.findUnique({
      where:  { slug },
      select: { slug: true, label: true, plural: true },
    })
    if (!t) return null
    return { slug: t.slug, label: t.label, plural: t.plural || `${t.label}s` }
  } catch (err) {
    console.warn('[catalogo] BD no disponible al resolver tipo:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Combinaciones tipo+municipio CON inventario activo.
 *
 * Es lo que alimenta `generateStaticParams` y el sitemap. Se generan solo las
 * que tienen algo que mostrar: una ruta por cada cruce posible serían sesenta
 * páginas, y la mayoría vacías. La regla de guarda de §1.3 prohíbe que una
 * página termine en «0 propiedades», y la forma más limpia de cumplirla es no
 * prerenderizar lo que no existe.
 *
 * Las combinaciones sin inventario siguen respondiendo —alguien puede escribir
 * la URL o venir de un enlace viejo— pero se renderizan bajo demanda, con
 * contenido de guarda y `noindex`.
 */
export async function combinacionesConInventario(): Promise<{ tipo: string; municipio: string }[]> {
  try {
    // groupBy en vez de distinct: la relación `municipality` es obligatoria en
    // el esquema, así que basta agrupar por su id y traducir a slug después.
    const [grupos, municipios] = await Promise.all([
      prisma.property.groupBy({
        by: ['type', 'municipality_id'],
        where: { status: 'available' },
      }),
      prisma.municipality.findMany({ select: { id: true, slug: true } }),
    ])
    const slugPorId = new Map(municipios.map(m => [m.id, m.slug]))

    return grupos
      .map(g => ({ tipo: g.type, municipio: slugPorId.get(g.municipality_id) }))
      .filter((c): c is { tipo: string; municipio: string } => Boolean(c.municipio))
  } catch (err) {
    console.warn('[catalogo] BD no disponible al derivar combinaciones:', err instanceof Error ? err.message : err)
    return []
  }
}

/** Municipios con inventario activo, por slug. Alimenta `/propiedades/[municipio]`. */
export async function municipiosConInventarioSlug(): Promise<string[]> {
  try {
    const rows = await prisma.municipality.findMany({
      where:  { properties: { some: { status: 'available' } } },
      select: { slug: true },
    })
    return rows.map(r => r.slug)
  } catch (err) {
    console.warn('[catalogo] BD no disponible al derivar municipios con inventario:', err instanceof Error ? err.message : err)
    return []
  }
}
