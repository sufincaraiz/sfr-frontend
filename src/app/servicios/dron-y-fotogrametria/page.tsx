import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { DatosVerificables } from '@/components/aeo/DatosVerificables'

// ─────────────────────────────────────────────────────────────────────────────
// BORRADOR — NO PUBLICADA
//
// Esta página está preparada con la estructura de la doctrina §3 pero NO se
// publica todavía: le faltan los datos que solo el titular puede confirmar.
//
// Mientras `BORRADOR` sea `true`:
//   - la página responde `noindex, nofollow`
//   - NO se emite el JSON-LD de `Service`
//   - no está en ningún sitemap ni enlazada desde el menú
//
// Por qué el JSON-LD queda apagado y no solo el índice: declarar un `Service`
// es exactamente lo que la doctrina §1.1 prohíbe hacer sin una página que lo
// sustente, y una página con seis TODO no sustenta nada. El marcado se enciende
// el día que los datos estén; hasta entonces, el código está listo y callado.
//
// PARA PUBLICAR: resolver los TODO de abajo, poner `BORRADOR = false`, añadir
// la ruta a `sitemap-paginas`, enlazarla desde el menú y /nosotros, añadir
// «fotogrametría y levantamiento aéreo de predios» a `knowsAbout` y el servicio
// a `hasOfferCatalog`, y hacer ping a IndexNow.
//
// ⚠ TODO REGULATORIO — RESOLVER ANTES QUE NINGÚN OTRO
// La operación comercial de drones en Colombia está reglada por la Aerocivil
// (RAC 100). Antes de ofrecer este servicio a terceros por escrito hay que
// confirmar el estado del registro de la aeronave y de la licencia del piloto,
// igual que con la Ley 1673 y los avalúos. Si no está en regla, esta página no
// se publica: una oferta publicada es una oferta, la haga quien la haga.
// ─────────────────────────────────────────────────────────────────────────────

const BORRADOR = true

// ⚠ TODO (titular): confirmar cada uno de estos datos antes de publicar.
//   1. EQUIPO — marca y modelo del dron, resolución de cámara, si hay RTK/GNSS.
//   2. ENTREGABLES — qué recibe el cliente exactamente: ¿fotos JPG?, ¿video 4K?,
//      ¿ortomosaico georreferenciado?, ¿nube de puntos?, ¿modelo 3D navegable?,
//      ¿curvas de nivel? Y en qué formatos.
//   3. COBERTURA — ¿los doce municipios del Gualivá, o solo algunos? ¿Hay
//      recargo por desplazamiento?
//   4. TIEMPOS — días hábiles entre el vuelo y la entrega.
//   5. SUPERFICIE — hectáreas máximas por vuelo/jornada.
//   6. PRECIO — si se publica, con fecha de corte; si no, se omite la fila.
//
// NOTA sobre el dato que SÍ existe: hoy el catálogo tiene 6 predios con
// recorrido virtual 360° publicado y NINGUNO con modelo 3D por fotogrametría.
// El componente y el campo `modelo3d_url` existen, pero no hay una sola pieza
// publicada que demuestre la capacidad. Publicar la página sin al menos un
// ejemplo visible deja la afirmación sin respaldo — que es justo lo que §1.1
// pide evitar. Lo más fuerte que se puede hacer por esta página no es escribir
// mejor: es levantar un predio y publicarlo.

export const metadata: Metadata = {
  title: 'Fotografía Aérea con Dron y Fotogrametría de Predios en La Vega',
  description:
    'Servicio de fotografía aérea con dron y fotogrametría de predios rurales en La Vega y ' +
    'la Provincia del Gualivá, Cundinamarca. Levantamiento de linderos, topografía y ' +
    'material para comercialización.',
  alternates: { canonical: `${SITE_URL}/servicios/dron-y-fotogrametria` },
  // Mientras sea borrador no entra a ningún índice.
  ...(BORRADOR ? { robots: { index: false, follow: false } } : {}),
  openGraph: {
    title: 'Fotografía Aérea con Dron y Fotogrametría de Predios — La Vega, Cundinamarca',
    description:
      'Levantamiento aéreo de predios rurales en La Vega y el Gualivá: linderos, topografía, ' +
      'vías de acceso y material para comercialización.',
    url: `${SITE_URL}/servicios/dron-y-fotogrametria`,
    type: 'website',
    locale: 'es_CO',
  },
}

// ⚠ TODO: las tres respuestas están redactadas sobre lo que el sitio ya afirma
// hoy. Revisar una por una: si alguna promete algo que no se presta tal cual,
// se corrige o se borra. Ninguna lleva cifra todavía porque no hay ninguna
// confirmada, y una respuesta directa sin cifra es débil pero honesta.
const FAQS = [
  {
    question: '¿Qué incluye un levantamiento aéreo de un predio rural?',
    answer:
      'TODO (titular): describir el entregable real. Hoy el sitio afirma que se capturan ' +
      'linderos, topografía, vías de acceso y el paisaje del predio con equipo aéreo de alta ' +
      'resolución. Falta precisar en qué formato se entrega cada cosa.',
  },
  {
    question: '¿En qué municipios se presta el servicio de dron?',
    answer:
      'TODO (titular): confirmar si la cobertura son los doce municipios de la Provincia del ' +
      'Gualivá o un subconjunto, y si hay recargo por desplazamiento.',
  },
  {
    question: '¿Cuánto tarda la entrega del material?',
    answer: 'TODO (titular): días hábiles entre el vuelo y la entrega.',
  },
]

export default function DronYFotogrametriaPage() {
  // Sin nivel intermedio «Servicios»: la ruta /servicios no existe todavía y un
  // breadcrumb que declara un paso que devuelve 404 es peor que uno corto.
  // Cuando exista el índice de servicios, se añade aquí y en la navegación.
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio',               href: '/' },
    { name: 'Dron y fotogrametría', href: '/servicios/dron-y-fotogrametria' },
  ])

  // El `Service` que se emitirá cuando la página deje de ser borrador. Se deja
  // escrito para que publicar sea cambiar una bandera y no reconstruirlo.
  const servicio = {
    '@context': 'https://schema.org',
    '@type':    'Service',
    '@id':      `${SITE_URL}/servicios/dron-y-fotogrametria#service`,
    name:       'Fotografía aérea con dron y fotogrametría de predios',
    serviceType: 'Levantamiento aéreo y fotogrametría de predios rurales',
    description:
      'Levantamiento aéreo de predios rurales en La Vega y la Provincia del Gualivá, ' +
      'Cundinamarca: linderos, topografía, vías de acceso y material fotográfico y de video ' +
      'para comercialización.',
    provider:   { '@id': `${SITE_URL}/#organization` },
    areaServed: { '@id': `${SITE_URL}/#organization` },
    url:        `${SITE_URL}/servicios/dron-y-fotogrametria`,
    // ⚠ TODO: `offers` con precio y `priceCurrency: 'COP'` solo si el titular
    // confirma que el precio se publica. Sin precio confirmado no va el campo.
  }

  return (
    <>
      <JsonLd data={breadcrumbs} />
      {!BORRADOR && <JsonLd data={servicio} />}
      {!BORRADOR && <JsonLd data={faqSchema(FAQS)} />}

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {BORRADOR && (
          <div style={{
            background: '#FEF3C7', borderBottom: '2px solid #F59E0B',
            padding: '0.9rem 1.5rem', textAlign: 'center',
            color: '#92400E', fontWeight: 700, fontSize: '0.9rem',
          }}>
            Borrador sin publicar — esta página no está indexada y no emite marcado de
            servicio. Faltan datos por confirmar.
          </div>
        )}

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.5rem,7vw,4rem) 1.5rem' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              Su Finca Raíz · La Vega, Cundinamarca
            </span>
            {/* El h1 usa vocabulario de TRÁFICO, no de entidad: «fotografía aérea
                con dron» y «predios» es lo que se busca. «Fotogrametría» entra
                porque aquí sí es el término del servicio, no jerga de categoría. */}
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,4vw,2.7rem)', lineHeight: 1.15, marginBottom: 14 }}>
              Fotografía aérea con dron y fotogrametría de predios en La Vega y el Gualivá
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1rem', maxWidth: 620, margin: '0 auto' }}>
              Levantamiento aéreo de linderos, topografía y vías de acceso en los municipios
              de la Provincia del Gualivá, Cundinamarca.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

          {/* ── Respuesta directa ── */}
          {/* ⚠ TODO: reescribir con una cifra concreta cuando exista (hectáreas
              por jornada, días de entrega o precio desde). Hoy no lleva ninguna
              porque no hay ninguna confirmada, y la doctrina §3.2 pide cifra. */}
          <RespuestaDirecta
            borrador
            pregunta="¿Qué es un levantamiento aéreo de predio con dron?"
            respuesta={
              'Un levantamiento aéreo con dron documenta un predio rural desde el aire para ' +
              'mostrar sus linderos, su topografía real y sus vías de acceso. Su Finca Raíz, ' +
              'centro de negocios inmobiliarios de La Vega, Cundinamarca, con matrícula ' +
              'mercantil 199483, presta este servicio en la Provincia del Gualivá tanto para ' +
              'los predios que comercializa como para propietarios que lo contratan aparte.'
            }
            fuenteDato="TODO (titular): confirmar equipo, entregables y cobertura."
          />

          {/* ── Datos verificables ── */}
          {/* ⚠ TODO: esta tabla es el corazón de la página para AEO y hoy está
              vacía de cifras. Una tabla con seis «por confirmar» no se publica:
              o se llena, o se retira antes de quitar el borrador. */}
          <DatosVerificables
            titulo="Ficha del servicio: levantamiento aéreo de predios — La Vega y el Gualivá, Cundinamarca"
            fechaCorte="2026-08-13"
            fuente="TODO (titular): confirmar. Datos propios de Su Finca Raíz."
            metodologia={
              'TODO (titular): describir cómo se realiza el vuelo y qué se mide, para que el ' +
              'dato tenga origen declarado como pide la doctrina §3.6.'
            }
            filas={[
              { etiqueta: 'Equipo utilizado',        valor: 'TODO', nota: 'Marca, modelo y resolución de cámara. Indicar si tiene RTK/GNSS.' },
              { etiqueta: 'Entregables',             valor: 'TODO', nota: '¿Fotos, video, ortomosaico, nube de puntos, modelo 3D? Y en qué formatos.' },
              { etiqueta: 'Superficie por jornada',  valor: 'TODO', unidad: 'hectáreas' },
              { etiqueta: 'Tiempo de entrega',       valor: 'TODO', unidad: 'días hábiles' },
              { etiqueta: 'Cobertura',               valor: 'TODO', nota: '¿Los doce municipios del Gualivá o un subconjunto? ¿Recargo por desplazamiento?' },
              { etiqueta: 'Registro ante Aerocivil', valor: 'TODO', nota: 'Estado del registro RAC 100 de la aeronave y licencia del piloto.' },
            ]}
          />

          {/* ── Encabezados en forma de pregunta (doctrina §3.4) ── */}
          <section style={{ marginTop: '2.5rem' }}>
            {FAQS.map(({ question, answer }) => (
              <div key={question} style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.6rem' }}>
                  {question}
                </h2>
                <p style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.95rem' }}>
                  {answer}
                </p>
              </div>
            ))}
          </section>

          {/* ── Fecha de actualización visible (doctrina §3.5) ── */}
          <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: '#64748B' }}>
            Última actualización: <time dateTime="2026-08-13">13 de agosto de 2026</time>.
          </p>

          {/* ── Migas de pan ── */}
          <nav aria-label="Breadcrumb" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Dron y fotogrametría</span>
          </nav>

        </div>
      </main>
    </>
  )
}
