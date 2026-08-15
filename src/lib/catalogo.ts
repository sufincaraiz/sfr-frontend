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

/**
 * Tope de seguridad para las vistas SIN paginar.
 *
 * Las rutas limpias muestran el municipio entero de una vez. Hoy el máximo es
 * La Vega con 33 propiedades, así que no hay nada que paginar; el tope existe
 * para que la página no crezca sin control si el inventario se multiplica.
 * Si alguna vez se alcanza, es la señal de que toca volver a paginar — y
 * entonces con segmentos de ruta, no con `?page=`.
 */
export const TOPE_SIN_PAGINAR = 60

export interface FiltroCatalogo {
  /** Slug del tipo de inmueble («finca», «lote»). */
  tipo?:      string
  /** NOMBRE del municipio («La Vega»), no su slug: es lo que guarda la relación. */
  municipio?: string
  maxPrecio?: string
  page?:      number
  /**
   * Trae el municipio entero hasta `TOPE_SIN_PAGINAR`, sin paginar.
   *
   * Existe para que las rutas limpias NO tengan que leer `searchParams`. Leer
   * `searchParams` —aunque la petición no traiga ninguno— saca la ruta de la
   * caché del borde y la convierte en dinámica: Vercel responde entonces
   * `private, no-store` y CADA visita de CADA rastreador baja a Railway.
   *
   * Con los ~20 agentes de IA declarados en robots.txt más Googlebot y
   * Bingbot, eso es la base de datos sirviendo tráfico de robots sin capa
   * intermedia, en las páginas de las que cuelgan las 35 fichas. Y de paso
   * gasta presupuesto de rastreo en páginas que no cambian por minuto.
   */
  todo?: boolean
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
        skip: f.todo ? 0 : (page - 1) * LIMIT,
        take: f.todo ? TOPE_SIN_PAGINAR : LIMIT,
        orderBy: [{ published_at: 'desc' }],
        include: {
          municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
          media:        { orderBy: { order: 'asc' }, take: 6 },
        },
      }),
      prisma.property.count({ where }),
    ])

    return {
      properties: rows.map(serializar),
      total,
      page:  f.todo ? 1 : page,
      // Sin paginar solo hay una pagina: la vista lo usa para no dibujar el
      // paginador ni desplazar el  del ItemList.
      pages: f.todo ? 1 : Math.ceil(total / LIMIT),
    }
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

/**
 * Tipos con inventario EN UN MUNICIPIO concreto, con su conteo.
 *
 * Alimenta la guarda de §1.3: cuando una combinación tipo+municipio se queda
 * vacía, la página no puede limitarse a decir «aquí no hay». Tiene que decir
 * qué sí hay y a dónde ir.
 *
 * El caso que lo motivó: al dejar «condominio» de ser un tipo, la ruta
 * /propiedades/condominio/la-vega se vació de golpe y su inventario se repartió
 * entre lotes y casas. Al derivarse, esto vale para cualquier combinación que
 * se vacíe en el futuro sin que nadie tenga que acordarse.
 */
export async function tiposConInventarioEnMunicipio(
  municipioNombre: string,
  excluirTipo?: string,
): Promise<{ slug: string; plural: string; n: number }[]> {
  try {
    const [grupos, tipos] = await Promise.all([
      prisma.property.groupBy({
        by: ['type'],
        where: {
          status: 'available',
          municipality: { name: { contains: municipioNombre, mode: 'insensitive' } },
        },
        _count: true,
      }),
      prisma.tipoPropiedad.findMany({ select: { slug: true, label: true, plural: true } }),
    ])
    const plural = new Map(tipos.map(t => [t.slug, t.plural || `${t.label}s`]))

    return grupos
      .filter(g => g.type !== excluirTipo)
      .map(g => ({ slug: g.type, plural: plural.get(g.type) ?? g.type, n: g._count }))
      .sort((a, b) => b.n - a.n)
  } catch (err) {
    console.warn('[catalogo] BD no disponible al derivar tipos del municipio:', err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Propiedades asignadas a UNA vereda concreta, por `vereda_id`.
 *
 * Distinto de las del municipio: hoy la página de vereda muestra el inventario
 * del municipio bajo el rótulo «cerca de X», que es honesto pero no responde a
 * «¿qué hay en venta EN Bulucaima?». Esa pregunta necesita el dato de vereda, y
 * hasta ahora era imposible responderla porque la tabla `veredas` estaba vacía:
 * no es que nadie hubiera asignado veredas, es que no existían como fila a la
 * que apuntar.
 *
 * Sin asignaciones devuelve lista vacía y la página cae a la guarda de §1.3.
 */
export async function propiedadesDeVereda(
  veredaSlug: string,
  municipioSlug: string,
): Promise<ResultadoCatalogo> {
  try {
    const v = await prisma.vereda.findFirst({
      where:  { slug: veredaSlug, municipality: { slug: municipioSlug } },
      select: { id: true },
    })
    if (!v) return { properties: [], total: 0, page: 1, pages: 0 }

    const where = { status: 'available', vereda_id: v.id }
    const [rows, total] = await Promise.all([
      prisma.property.findMany({
        where,
        take: TOPE_SIN_PAGINAR,
        orderBy: [{ published_at: 'desc' }],
        include: {
          municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
          media:        { orderBy: { order: 'asc' }, take: 6 },
        },
      }),
      prisma.property.count({ where }),
    ])
    return { properties: rows.map(serializar), total, page: 1, pages: 1 }
  } catch (err) {
    console.warn('[catalogo] BD no disponible al derivar propiedades de vereda:', err instanceof Error ? err.message : err)
    return { properties: [], total: 0, page: 1, pages: 0 }
  }
}

/** Cuántas propiedades activas tiene cada vereda, por slug. Para el admin y los listados. */
export async function inventarioPorVereda(): Promise<Map<string, number>> {
  try {
    const rows = await prisma.vereda.findMany({
      select: { slug: true, _count: { select: { properties: { where: { status: 'available' } } } } },
    })
    return new Map(rows.map(r => [r.slug, r._count.properties]))
  } catch (err) {
    console.warn('[catalogo] BD no disponible al contar por vereda:', err instanceof Error ? err.message : err)
    return new Map()
  }
}

/**
 * La vereda de una propiedad, si la tiene asignada y tiene página publicada.
 *
 * Devuelve `null` cuando no hay vereda o cuando la que hay no tiene página en
 * el sitio. Es la misma guarda que `urlDeMunicipio` aplica a los municipios
 * (§1.3): una ficha no enlaza a una ruta que devuelve 404.
 */
export async function veredaDePropiedad(
  veredaId: string | null,
  slugsConPagina: readonly string[],
): Promise<{ slug: string; name: string } | null> {
  if (!veredaId) return null
  try {
    const v = await prisma.vereda.findUnique({
      where:  { id: veredaId },
      select: { slug: true, name: true },
    })
    if (!v || !slugsConPagina.includes(v.slug)) return null
    return v
  } catch (err) {
    console.warn('[catalogo] BD no disponible al resolver vereda:', err instanceof Error ? err.message : err)
    return null
  }
}
