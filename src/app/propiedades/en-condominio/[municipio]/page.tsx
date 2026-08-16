import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { CatalogoLimpio } from '@/components/propiedades/CatalogoLimpio'
import {
  fetchPropiedades, resolverMunicipio, municipiosConCondominio,
} from '@/lib/catalogo'

// ─────────────────────────────────────────────────────────────────────────────
// /propiedades/en-condominio/[municipio]
//
// «Condominio» fue un TIPO de inmueble y se retiró de la taxonomía, con razón:
// no es una clase de inmueble, es dónde está el inmueble. Pero retirarlo dejó a
// 12 propiedades sin ninguna vía pública de búsqueda, y «condominios campestres
// La Vega» es una consulta con demanda real. Un atributo que la gente nombra
// necesita filtro; un tipo que no existe, no.
//
// Esta ruta es honesta con la distinción: agrupa lotes, casas y fincas que
// están en un condominio, sin fingir que «condominio» sea un tipo. Por eso el
// segmento es `en-condominio` y no `condominio`, y por eso cruza con tipo.
//
// El segmento estático gana al dinámico `[filtro]`, así que esta ruta se
// resuelve antes que /propiedades/[filtro]/[municipio] sin tocarla. El segundo
// segmento se llama `municipio` igual que allí: Next exige el mismo nombre en
// rutas hermanas del mismo nivel, y si no coincide responde 500 a TODA la rama
// con el build en verde.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

interface Params { municipio: string }

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await municipiosConCondominio()
  return slugs.map(municipio => ({ municipio }))
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { municipio: slug } = await params
  const m = await resolverMunicipio(slug)
  if (!m) return {}

  const { total } = await fetchPropiedades({ municipio: m.name, enCondominio: true })
  const ruta = `/propiedades/en-condominio/${m.slug}`

  const titulo = `Propiedades en Condominio Campestre en ${m.name}, Cundinamarca`

  return {
    title: titulo,
    description:
      total > 0
        ? `${total} propiedades dentro de condominios campestres en ${m.name}: lotes, ` +
          `casas y fincas con vigilancia y zonas comunes. Precios y fichas verificadas.`
        : `Propiedades dentro de condominios campestres en ${m.name}, Cundinamarca.`,
    alternates: { canonical: `${SITE_URL}${ruta}` },
    // Sin inventario no se indexa: una página que termina en vacío resta
    // autoridad, y con `en-condominio` hay una por cada municipio posible.
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: titulo, url: `${SITE_URL}${ruta}`, type: 'website', locale: 'es_CO' },
  }
}

export default async function EnCondominioMunicipioPage(
  { params }: { params: Promise<Params> },
) {
  const { municipio: slug } = await params

  const m = await resolverMunicipio(slug)
  if (!m) notFound()

  const data = await fetchPropiedades({ municipio: m.name, enCondominio: true, todo: true })

  return (
    <CatalogoLimpio
      data={data}
      municipio={m}
      condominio
      ruta={`/propiedades/en-condominio/${m.slug}`}
    />
  )
}
