import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, itemListSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { PropiedadesGrid } from '@/components/propiedades/PropiedadesGrid'
import {
  fetchPropiedades, municipiosConCondominio, tiposEnCondominio, resolverMunicipio,
} from '@/lib/catalogo'
import { getTipoPlurales } from '@/lib/property-types.server'

// ─────────────────────────────────────────────────────────────────────────────
// /propiedades/en-condominio — la vista de provincia del atributo.
//
// Ver la ruta hermana con municipio para por qué existe. Aquí, además, hay que
// sostener la distinción por escrito: la página explica que agrupa lotes, casas
// y fincas QUE ESTÁN en un condominio, y no un tipo de inmueble llamado
// «condominio». Es la misma corrección de vocabulario que se hizo en los datos,
// hecha ahora donde el cliente la lee.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

const RUTA = '/propiedades/en-condominio'

export async function generateMetadata(): Promise<Metadata> {
  const { total } = await fetchPropiedades({ enCondominio: true })
  const titulo = 'Propiedades en Condominio Campestre en la Provincia del Gualivá'

  return {
    title: titulo,
    description:
      total > 0
        ? `${total} lotes, casas y fincas dentro de condominios campestres en La Vega y ` +
          `la Provincia del Gualivá, Cundinamarca. Fichas con precio, área y ubicación.`
        : 'Lotes, casas y fincas dentro de condominios campestres en la Provincia del Gualivá.',
    alternates: { canonical: `${SITE_URL}${RUTA}` },
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: titulo, url: `${SITE_URL}${RUTA}`, type: 'website', locale: 'es_CO' },
  }
}

export default async function EnCondominioPage() {
  const [data, slugsMuni, porTipo, plurales] = await Promise.all([
    fetchPropiedades({ enCondominio: true, todo: true }),
    municipiosConCondominio(),
    tiposEnCondominio(),
    getTipoPlurales(),
  ])

  const municipios = (
    await Promise.all(slugsMuni.map(s => resolverMunicipio(s)))
  ).filter((m): m is { slug: string; name: string } => m !== null)

  const vacio = data.total === 0
  const titulo = 'Propiedades en Condominio Campestre en la Provincia del Gualivá'

  const migas = [
    { name: 'Inicio',       href: '/' },
    { name: 'Propiedades',  href: '/propiedades' },
    { name: 'En condominio', href: RUTA },
  ]

  // Reparto por tipo, en palabras. Es la frase que sostiene la distinción:
  // lo que hay son lotes y casas EN condominio, no «condominios».
  const reparto = porTipo
    .map(t => `${t.n} ${(plurales[t.slug] ?? t.slug).toLowerCase()}`)
    .join(', ')
    .replace(/, ([^,]*)$/, ' y $1')

  return (
    <>
      <JsonLd data={breadcrumbSchema(migas)} />
      {!vacio && (
        <JsonLd data={itemListSchema({
          url: `${SITE_URL}${RUTA}`,
          name: titulo,
          numberOfItems: data.total,
          desde: 1,
          orden: 'desc',
          items: data.properties.map(p => ({
            name: p.title ?? 'Propiedad en condominio',
            url:  `${SITE_URL}/propiedad/${p.slug}`,
          })),
        })} />
      )}

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <section style={{
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          padding: '7rem 1.5rem 3rem', textAlign: 'center',
        }}>
          <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Su Finca Raíz · Provincia del Gualivá
          </p>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.5rem)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
            {titulo}
          </h1>
          {!vacio && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', maxWidth: 560, margin: '0 auto' }}>
              {data.total} propiedad{data.total !== 1 ? 'es' : ''} disponible{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </section>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

          {!vacio && (
            <RespuestaDirecta
              pregunta="¿Qué hay en venta dentro de condominios campestres en el Gualivá?"
              respuesta={
                `Hay ${data.total} propiedades disponibles dentro de condominios campestres: ` +
                `${reparto}. «Condominio» no es un tipo de inmueble sino dónde está el inmueble: ` +
                `dentro de una copropiedad con vigilancia, vías internas y zonas comunes. ` +
                `Por eso aquí aparecen juntos lotes para construir y casas ya construidas.`
              }
            />
          )}

          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <Link href="/propiedades" style={{ color: '#64748B', textDecoration: 'none' }}>Propiedades</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>En condominio</span>
          </nav>

          {municipios.length > 0 && (
            <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '2rem' }}>
              {municipios.map(m => (
                <Link
                  key={m.slug}
                  href={`/propiedades/en-condominio/${m.slug}`}
                  style={{ padding: '0.5rem 1rem', borderRadius: 999, border: '1px solid #CBD5E1', background: '#fff', color: '#0D2D5E', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  En condominio en {m.name}
                </Link>
              ))}
            </nav>
          )}

          {vacio ? (
            <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '2rem 1.75rem' }}>
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                ¿Se pueden conseguir propiedades en condominio campestre?
              </h2>
              <p style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.95rem', marginBottom: '1.25rem' }}>
                Sí. Los condominios campestres de la Provincia del Gualivá son una parte
                habitual del inventario, aunque en este momento no haya ninguno publicado.
                La búsqueda de un predio concreto dentro de un condominio se puede encargar
                directamente.
              </p>
              <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                Ver todo el catálogo
              </Link>
            </section>
          ) : (
            <PropiedadesGrid properties={data.properties} />
          )}
        </div>
      </main>
    </>
  )
}
