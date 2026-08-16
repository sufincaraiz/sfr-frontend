import Link from 'next/link'
import { Home, ChevronRight, MapPin } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, itemListSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { PropiedadesGrid } from '@/components/propiedades/PropiedadesGrid'
import { propiedadesDeVereda } from '@/lib/catalogo'
import { cargarEnlaces } from '@/lib/enlaces'
import { UMBRAL_PROMOCION, type VeredaPublicable } from '@/lib/malla-veredas'
import { VeredasDelMunicipio } from '@/components/malla/VeredasDelMunicipio'

/**
 * Página de una vereda PROMOCIONADA: sin contenido editorial, solo lo derivable.
 *
 * Existe porque a partir de `UMBRAL_PROMOCION` propiedades el listado propio ya
 * justifica la URL y deja de ser la página delgada de §1.3. Por debajo de ese
 * umbral la vereda no tiene página: sigue en la tabla para agrupar y filtrar.
 *
 * NO finge tener lo que no tiene. No hay altitud, ni temperatura, ni acceso
 * vial, ni FAQ escritas: esos datos son de la vereda real y nadie los ha
 * capturado. Inventarlos para rellenar sería exactamente lo que se hizo con
 * «Ucranea», que describía Sasaima bajo un nombre de La Vega.
 *
 * Lo que sí lleva: el inventario, que es cierto y es lo que justifica la
 * página; el municipio; y la malla hacia las veredas hermanas. Cuando llegue el
 * contenido editorial, la entrada en `veredas-data.ts` sustituye a esto sin
 * cambiar la URL.
 */
export async function VeredaDerivada({ vereda }: { vereda: VeredaPublicable }) {
  const [data, enlaces] = await Promise.all([
    propiedadesDeVereda(vereda.slug, vereda.municipio_slug),
    cargarEnlaces(),
  ])

  const hrefMunicipio = enlaces.municipio(vereda.municipio_slug)
  const hrefCatalogo  = enlaces.catalogoMunicipio(vereda.municipio_slug)
  const titulo = `Propiedades en Venta en la Vereda ${vereda.name}, ${vereda.municipio_name}`

  const migas = [
    { name: 'Inicio',  href: '/' },
    { name: 'Veredas', href: '/veredas' },
    { name: `${vereda.name} — ${vereda.municipio_name}`, href: `/veredas/${vereda.slug}` },
  ]

  return (
    <>
      <JsonLd data={breadcrumbSchema(migas)} />
      {data.total > 0 && (
        <JsonLd data={itemListSchema({
          url:  `${SITE_URL}/veredas/${vereda.slug}`,
          name: `Propiedades en venta en la vereda ${vereda.name}, ${vereda.municipio_name}, Cundinamarca`,
          numberOfItems: data.total,
          orden: 'desc',
          items: data.properties.map(p => ({
            name: p.title ?? `Propiedad en la vereda ${vereda.name}`,
            url:  `${SITE_URL}/propiedad/${p.slug}`,
          })),
        })} />
      )}

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <section style={{
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          padding: '7rem 1.5rem 3rem',
        }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Vereda · {vereda.municipio_name}
            </p>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3.8vw,2.6rem)', lineHeight: 1.15, margin: 0 }}>
              {titulo}
            </h1>
          </div>
        </section>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2.5rem clamp(1rem,3vw,2rem) 3rem' }}>

          <RespuestaDirecta
            pregunta={`¿Qué hay en venta en la vereda ${vereda.name}?`}
            respuesta={
              `Hay ${data.total} ${data.total === 1 ? 'propiedad disponible' : 'propiedades disponibles'} ` +
              `asignadas a la vereda ${vereda.name}, en ${vereda.municipio_name}, Cundinamarca. ` +
              `Esta página recoge el inventario de la vereda; la ficha de cada inmueble lleva su ` +
              `área, su precio y sus servicios verificados.`
            }
            fuenteDato="Datos propios de Su Finca Raíz"
          />

          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap', margin: '0 0 1.75rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <Link href="/veredas" style={{ color: '#64748B', textDecoration: 'none' }}>Veredas</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{vereda.name}</span>
          </nav>

          {/* Aviso honesto en vez de relleno: esta página no tiene el contenido
              que sí tienen las demás, y decirlo es mejor que simularlo. */}
          <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
            Esta vereda tiene página propia porque supera las {UMBRAL_PROMOCION} propiedades
            publicadas. Todavía no tiene ficha de territorio —altitud, clima y acceso vial—;
            mientras tanto, la información general está en{' '}
            {hrefMunicipio
              ? <Link href={hrefMunicipio} style={{ color: '#1B56A1', fontWeight: 600 }}>la página de {vereda.municipio_name}</Link>
              : <>la página de {vereda.municipio_name}</>}.
          </p>

          {data.total > 0 ? (
            <PropiedadesGrid properties={data.properties} />
          ) : (
            <p style={{ color: '#475569' }}>
              En este momento no hay propiedades publicadas en la vereda {vereda.name}.
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '2rem 0' }}>
            {hrefCatalogo && (
              <Link href={hrefCatalogo} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                <MapPin size={15} /> Ver todo en {vereda.municipio_name}
              </Link>
            )}
          </div>

          <VeredasDelMunicipio
            municipioSlug={vereda.municipio_slug}
            municipioNombre={vereda.municipio_name}
            excluirSlug={vereda.slug}
          />
        </div>
      </main>
    </>
  )
}
