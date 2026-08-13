import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, itemListSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { PropiedadesGrid } from '@/components/propiedades/PropiedadesGrid'
import { Paginacion } from '@/components/propiedades/Paginacion'
import { respuestaCatalogoLimpio } from '@/lib/respuestas-directas'
import { LIMIT, type ResultadoCatalogo } from '@/lib/catalogo'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'

// ─────────────────────────────────────────────────────────────────────────────
// <CatalogoLimpio> — la vista de /propiedades/[municipio] y /[tipo]/[municipio].
//
// Las dos rutas comparten todo salvo el título y las migas, así que comparten
// componente. Es la vista CANÓNICA del catálogo filtrado: /propiedades?municipio=
// sigue existiendo para los filtros interactivos, pero apunta aquí con su
// canonical porque son la misma página.
//
// LA REGLA DE GUARDA DE §1.3 ESTÁ AQUÍ. Cuando la combinación no tiene
// inventario, la página NO dice «0 propiedades»: dice lo que sigue siendo
// cierto —que la cobertura son los doce municipios y la captación está
// abierta—, enlaza al catálogo completo y se marca `noindex`. Una página que
// termina en vacío resta autoridad al dominio entero, y una indexable que
// termina en vacío lo hace además a escala, porque hay una por cada cruce
// posible de tipo y municipio.
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogoLimpioProps {
  data:          ResultadoCatalogo
  /** Nombre del municipio, ya resuelto desde su slug. */
  municipio:     { slug: string; name: string }
  /** Tipo de inmueble, si la ruta lo lleva. */
  tipo?:         { slug: string; plural: string }
  /** Ruta canónica de esta vista, sin dominio. */
  ruta:          string
}

export async function CatalogoLimpio({ data, municipio, tipo, ruta }: CatalogoLimpioProps) {
  const vacio = data.total === 0

  const titulo = tipo
    ? `${tipo.plural} en Venta en ${municipio.name}, Cundinamarca`
    : `Propiedades en Venta en ${municipio.name}, Cundinamarca`

  const respuesta = await respuestaCatalogoLimpio({
    municipio:  municipio.name,
    tipoPlural: tipo?.plural,
    total:      data.total,
  })

  const migas = [
    { name: 'Inicio',      href: '/' },
    { name: 'Propiedades', href: '/propiedades' },
    ...(tipo ? [{ name: tipo.plural, href: `/propiedades/${tipo.slug}/${municipio.slug}` }] : []),
    { name: municipio.name, href: ruta },
  ]

  const listado = itemListSchema({
    url:  `${SITE_URL}${ruta}`,
    name:  titulo,
    numberOfItems: data.total,
    desde: (data.page - 1) * LIMIT + 1,
    orden: 'desc',
    items: data.properties.map(p => ({
      name: p.title ?? `${tipo?.plural ?? 'Propiedad'} en ${municipio.name}`,
      url:  `${SITE_URL}/propiedad/${p.slug}`,
    })),
  })

  return (
    <>
      <JsonLd data={breadcrumbSchema(migas)} />
      {/* Sin ItemList cuando no hay nada que listar: un ItemList con cero
          elementos es una promesa de contenido que la página no cumple. */}
      {!vacio && <JsonLd data={listado} />}

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        <section style={{
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          padding: '7rem 1.5rem 3rem',
          textAlign: 'center',
        }}>
          <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Su Finca Raíz · La Vega, Cundinamarca
          </p>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.5rem)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
            {titulo}
          </h1>
          {!vacio && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', maxWidth: 520, margin: '0 auto' }}>
              {data.total} propiedad{data.total !== 1 ? 'es' : ''} disponible{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </section>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>

          <RespuestaDirecta {...respuesta} />

          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <Link href="/propiedades" style={{ color: '#64748B', textDecoration: 'none' }}>Propiedades</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>
              {tipo ? `${tipo.plural} en ${municipio.name}` : municipio.name}
            </span>
          </nav>

          {vacio ? (
            /* Guarda de §1.3: nunca «0 propiedades». Lo que se afirma aquí
               —la cobertura de los doce municipios— sigue siendo cierto
               independientemente del inventario de hoy. */
            <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '2rem 1.75rem' }}>
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                ¿Se puede conseguir {tipo ? tipo.plural.toLowerCase() : 'una propiedad'} en {municipio.name}?
              </h2>
              <p style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.95rem', marginBottom: '1.25rem' }}>
                Sí. {municipio.name} está dentro de los {DATOS_OFICIALES.municipiosProvincia} municipios
                de la Provincia del Gualivá donde Su Finca Raíz capta y comercializa inmuebles, aunque
                en este momento no haya {tipo ? tipo.plural.toLowerCase() : 'propiedades'} publicadas
                allí. El inventario cambia de forma continua y la búsqueda de un predio concreto se
                puede encargar directamente.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                  Ver todo el catálogo
                </Link>
                <a href="https://wa.me/573218826730" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
                  Encargar la búsqueda por WhatsApp
                </a>
              </div>
            </section>
          ) : (
            <>
              <PropiedadesGrid properties={data.properties} />
              <Paginacion page={data.page} pages={data.pages} total={data.total} />
            </>
          )}
        </div>
      </main>
    </>
  )
}
