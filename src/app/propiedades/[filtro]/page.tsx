import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { CatalogoLimpio } from '@/components/propiedades/CatalogoLimpio'
import {
  fetchPropiedades, resolverMunicipio, resolverTipo,
  municipiosConInventarioSlug,
} from '@/lib/catalogo'

// ─────────────────────────────────────────────────────────────────────────────
// /propiedades/[municipio] — ruta limpia del catálogo por municipio.
//
// Es la versión CANÓNICA de /propiedades?municipio=X. La de querystring sigue
// existiendo porque los filtros interactivos la necesitan, pero declara su
// canonical aquí: son la misma vista y un motor no debe indexar las dos.
//
// UN SEGMENTO ES SIEMPRE UN MUNICIPIO. Si el slug coincide con un tipo de
// inmueble —alguien escribe /propiedades/finca— se redirige a la vista con
// filtro en vez de devolver 404: es una URL que un humano teclea con una
// intención clara, y responderle «no existe» pierde la visita.
//
// Cualquier otro slug devuelve 404. Una ruta que acepta cualquier segmento
// fabrica páginas infinitas sin contenido, y eso resta autoridad al dominio.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

interface Params { filtro: string }

/** Solo los municipios con inventario se prerenderizan; el resto va bajo demanda. */
export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await municipiosConInventarioSlug()
  return slugs.map(filtro => ({ filtro }))
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { filtro: slug } = await params
  const m = await resolverMunicipio(slug)
  if (!m) return {}

  const { total } = await fetchPropiedades({ municipio: m.name })
  const ruta = `/propiedades/${m.slug}`

  const titulo = `Propiedades en Venta en ${m.name}, Cundinamarca`
  const desc =
    total > 0
      ? `${total} propiedad${total !== 1 ? 'es' : ''} en venta en ${m.name}, Cundinamarca: ` +
        'fincas, lotes y casas campestres en la Provincia del Gualivá. ☎ 321 882 6730.'
      : `Su Finca Raíz cubre ${m.name}, Cundinamarca, dentro de la Provincia del Gualivá. ` +
        'Consulta la disponibilidad actual. ☎ 321 882 6730.'

  return {
    title: titulo,
    description: desc,
    alternates: { canonical: `${SITE_URL}${ruta}` },
    // Sin inventario la página existe pero no se indexa: ver la guarda de §1.3
    // en <CatalogoLimpio>. Cuando entre la primera propiedad, se indexa sola.
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${titulo} | Su Finca Raíz`,
      description: desc,
      url: `${SITE_URL}${ruta}`,
      type: 'website',
      locale: 'es_CO',
    },
    twitter: { description: desc },
  }
}

// SIN searchParams A PROPOSITO. Leer searchParams —aunque la peticion no traiga
// ninguno— saca la ruta de la cache del borde: Vercel responde entonces
// `private, no-store` y CADA visita de CADA rastreador baja a Railway.
//
// La vista muestra el municipio entero hasta TOPE_SIN_PAGINAR. Hoy el maximo es
// La Vega con 33 propiedades, asi que no habia nada que paginar, y un rastreador
// ve las 33 fichas enlazadas desde una sola pagina en vez de tres.
export default async function PropiedadesPorMunicipio(
  { params }: { params: Promise<Params> },
) {
  const { filtro: slug } = await params

  const m = await resolverMunicipio(slug)
  if (!m) {
    // ¿Es un tipo de inmueble y no un municipio? Entonces la intención es clara.
    const tipo = await resolverTipo(slug)
    if (tipo) permanentRedirect(`/propiedades?tipo=${tipo.slug}`)
    notFound()
  }

  const data = await fetchPropiedades({ municipio: m.name, todo: true })

  return (
    <CatalogoLimpio
      data={data}
      municipio={m}
      ruta={`/propiedades/${m.slug}`}
    />
  )
}
