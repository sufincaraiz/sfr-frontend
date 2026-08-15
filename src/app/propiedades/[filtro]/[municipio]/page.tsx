import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { CatalogoLimpio } from '@/components/propiedades/CatalogoLimpio'
import {
  fetchPropiedades, resolverMunicipio, resolverTipo,
  combinacionesConInventario,
} from '@/lib/catalogo'

// ─────────────────────────────────────────────────────────────────────────────
// /propiedades/[tipo]/[municipio] — ruta limpia de tipo + municipio.
//
// Es la que captura la demanda real: «fincas en venta Sasaima» se busca, y hasta
// ahora esa consulta solo tenía una URL con parámetros. Los redirects legacy del
// WordPress viejo apuntaban a /propiedades?tipo=&municipio=, o sea que una
// visita desde Google encadenaba redirect y luego canonical; ahora aterrizan
// directamente aquí.
//
// Se prerenderizan SOLO las combinaciones con inventario. Los cruces posibles
// son sesenta y la mayoría estaría vacía: prerenderizar lo vacío es fabricar
// páginas delgadas a escala. El resto responde bajo demanda, con la guarda de
// §1.3 y `noindex`, y entra al índice solo cuando entra su primera propiedad.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

interface Params { filtro: string; municipio: string }

export async function generateStaticParams(): Promise<Params[]> {
  const combinaciones = await combinacionesConInventario()
  // El primer segmento se llama `filtro` y no `tipo` porque lo comparte con
  // /propiedades/[filtro], y Next exige que un mismo nivel dinámico lleve el
  // mismo nombre en todas las rutas hermanas: con `[municipio]` arriba y
  // `[tipo]` aquí, el servidor responde 500 a TODA la rama —y el build pasa en
  // verde igualmente, que es por lo que esto se verifica contra el HTML
  // servido y no contra la salida de `next build`.
  //
  // Aquí `filtro` ES el tipo de inmueble; en la ruta de un solo segmento es el
  // municipio. Lo desambigua el número de segmentos, no el nombre.
  return combinaciones.map(c => ({ filtro: c.tipo, municipio: c.municipio }))
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { filtro: tipoSlug, municipio: muniSlug } = await params
  const [t, m] = await Promise.all([resolverTipo(tipoSlug), resolverMunicipio(muniSlug)])
  if (!t || !m) return {}

  const { total } = await fetchPropiedades({ tipo: t.slug, municipio: m.name })
  const ruta = `/propiedades/${t.slug}/${m.slug}`

  const titulo = `${t.plural} en Venta en ${m.name}, Cundinamarca`
  const desc =
    total > 0
      ? `${total} ${total === 1 ? t.label.toLowerCase() : t.plural.toLowerCase()} en venta en ` +
        `${m.name}, Cundinamarca, en la Provincia del Gualivá. ☎ 321 882 6730.`
      : `Su Finca Raíz capta ${t.plural.toLowerCase()} en ${m.name}, Cundinamarca. ` +
        'Consulta la disponibilidad actual. ☎ 321 882 6730.'

  return {
    title: titulo,
    description: desc,
    alternates: { canonical: `${SITE_URL}${ruta}` },
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

// Sin searchParams, por lo mismo que la ruta de un segmento: leerlos convierte
// la ruta en dinamica y la saca de la cache del borde.
export default async function PropiedadesPorTipoYMunicipio(
  { params }: { params: Promise<Params> },
) {
  const { filtro: tipoSlug, municipio: muniSlug } = await params

  const [t, m] = await Promise.all([resolverTipo(tipoSlug), resolverMunicipio(muniSlug)])
  // Ni el tipo ni el municipio se inventan: si alguno no existe, 404.
  if (!t || !m) notFound()

  const data = await fetchPropiedades({ tipo: t.slug, municipio: m.name, todo: true })

  return (
    <CatalogoLimpio
      data={data}
      municipio={m}
      tipo={{ slug: t.slug, plural: t.plural }}
      ruta={`/propiedades/${t.slug}/${m.slug}`}
    />
  )
}
