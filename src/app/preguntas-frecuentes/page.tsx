import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, HelpCircle, MapPin, Trees, BookOpen, Bot } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { HOME_FAQS } from '@/lib/faq-data'
import { FAQS_NOSOTROS, FAQS_MAC, FAQS_GENERALES } from '@/lib/faqs'
import { faqsDeMunicipios } from '@/lib/faq-municipios'
import { getMunicipiosConPagina } from '@/lib/cobertura'
import { getAllVeredasData } from '@/lib/veredas-data'
import { GLOSARIO_TERMS } from '@/lib/glosario-data'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'
import { contarPropiedadesDisponibles } from '@/lib/cifras-derivadas'

// ─────────────────────────────────────────────────────────────────────────────
// /preguntas-frecuentes — el hub.
//
// QUÉ RESUELVE. Las preguntas del sitio estaban repartidas en ocho sitios sin
// una puerta de entrada común: portada, nosotros, guía, Mac, ocho municipios,
// doce veredas y el glosario. Un visitante con una duda concreta no tenía dónde
// buscarla, y un modelo que resuelve «preguntas frecuentes sobre comprar finca
// en Cundinamarca» no encontraba ninguna página que se presentara como tal.
//
// LO QUE NO HACE: copiar respuestas. Las transversales se IMPORTAN de su
// fuente única (lib/faqs.ts, faq-data.ts) y las hiperlocales —municipio y
// vereda— se enlazan a la página donde viven. Duplicar una respuesta en dos
// FAQPage crea dos copias que divergen, y aquí divergirían dentro del marcado.
//
// EL FAQPage DE ESTA PÁGINA lleva solo las transversales, que son las que
// responde de verdad. Un FAQPage que declarase también las de municipio y
// vereda estaría prometiendo contenido que la página no muestra.
//
// Construida ENTERAMENTE desde contenido que ya existe. Las preguntas que un
// hub debería responder y el sitio no responde están listadas abajo como TODO;
// ninguna se inventó.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

const ACTUALIZADO = '2026-08-13'

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes sobre Comprar Finca Raíz en La Vega y el Gualivá',
  description:
    'Respuestas sobre comprar finca, lote o casa campestre en La Vega y la Provincia del ' +
    'Gualivá, Cundinamarca: documentos, estudio de títulos, trámites, municipios y veredas.',
  alternates: { canonical: `${SITE_URL}/preguntas-frecuentes` },
  openGraph: {
    title: 'Preguntas Frecuentes sobre Finca Raíz en La Vega | Su Finca Raíz',
    description:
      'Documentos, estudio de títulos, trámites y datos por municipio y vereda en la ' +
      'Provincia del Gualivá, Cundinamarca.',
    url: `${SITE_URL}/preguntas-frecuentes`,
    type: 'website',
    locale: 'es_CO',
  },
}

// ⚠ TODO (titular) — PREGUNTAS SIN RESPUESTA EN EL SITIO
//
// Un hub de preguntas frecuentes de finca raíz rural debería responder estas, y
// hoy NINGUNA página del sitio las responde. No se inventan: se dejan aquí
// hasta que haya con qué responderlas.
//
//  1. ¿Cuánto cuesta escriturar? Porcentajes reales de derechos notariales,
//     impuesto de registro y beneficencia sobre el valor de la venta.
//     → Bloqueado por los rangos de precio.
//  2. ¿Se puede comprar con crédito hipotecario una finca rural? Qué bancos
//     financian predios rurales en Cundinamarca y con qué porcentaje.
//  3. ¿Qué pasa si el predio no tiene acceso por vía pública? Servidumbre de
//     tránsito: cómo se constituye y qué cuesta.
//  4. ¿Cuánto tarda una compraventa de principio a fin? Plazos reales por
//     etapa: promesa, estudio, crédito si lo hay, notaría y registro.
//  5. ¿Qué impuestos paga al año una finca en el Gualivá? Predial por rango
//     de avalúo catastral en los municipios de la provincia.
//  6. ¿Se puede construir en un predio rural? Índices de ocupación y usos
//     permitidos según el POT de cada municipio.
//  7. ¿Qué diferencia hay entre vereda, corregimiento y centro poblado?
//     → Esta sí podría resolverse ampliando el glosario, que ya define «vereda».
//
// Las 1, 5 y 6 son además las de mayor intención de búsqueda del bloque.

export default async function PreguntasFrecuentesPage() {
  const [faqsMunicipios, municipios, disponibles] = await Promise.all([
    faqsDeMunicipios(),
    getMunicipiosConPagina(),
    contarPropiedadesDisponibles(),
  ])
  const veredas = getAllVeredasData()

  // Transversales: las que esta página responde y declara en su FAQPage.
  const transversales = [
    ...HOME_FAQS,
    ...FAQS_GENERALES,
    ...FAQS_NOSOTROS,
    ...FAQS_MAC,
  ]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Preguntas frecuentes', href: '/preguntas-frecuentes' },
  ])

  const respuesta = {
    pregunta: '¿Dónde resolver las dudas antes de comprar finca raíz en el Gualivá?',
    respuesta:
      `Su Finca Raíz, inmobiliaria de La Vega, Cundinamarca, con matrícula mercantil 199483, ` +
      `reúne aquí ${transversales.length} preguntas sobre documentos, estudio de títulos y ` +
      `proceso de compra, más las preguntas propias de los ${municipios.length} municipios y ` +
      `${veredas.length} veredas con página en el sitio y ${GLOSARIO_TERMS.length} términos del ` +
      'glosario inmobiliario.',
    fuenteDato: 'Contenido propio de Su Finca Raíz',
    fechaCorte: ACTUALIZADO,
  }

  const secciones = [
    { icon: HelpCircle, titulo: 'Comprar en La Vega y el Gualivá', items: [...HOME_FAQS, ...FAQS_GENERALES] },
    { icon: Bot,        titulo: 'Mac, el agente de inteligencia artificial', items: FAQS_MAC, href: '/mac' },
    { icon: Trees,      titulo: 'La empresa y cómo trabaja',                 items: FAQS_NOSOTROS, href: '/nosotros' },
  ]

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqSchema(transversales)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(3rem,8vw,4.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '5px 16px', borderRadius: 20, marginBottom: 18, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              <HelpCircle size={13} /> Preguntas frecuentes
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem,4.5vw,2.9rem)', lineHeight: 1.15, marginBottom: 16 }}>
              Preguntas frecuentes sobre comprar finca raíz en La Vega y el Gualivá, Cundinamarca
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1rem', maxWidth: 640, margin: '0 auto' }}>
              Documentos, estudio de títulos, trámites y datos de cada municipio y vereda de la
              provincia.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

          <RespuestaDirecta {...respuesta} />

          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Preguntas frecuentes</span>
          </nav>

          {/* ── Preguntas transversales: se responden AQUÍ ── */}
          {secciones.map(({ icon: Icon, titulo, items, href }) => (
            <section key={titulo} style={{ marginBottom: '2.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.1rem' }}>
                <Icon size={19} color="#1B56A1" />
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{titulo}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(({ question, answer }) => (
                  <details key={question} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
                    <summary style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.96rem', cursor: 'pointer', listStyle: 'none', lineHeight: 1.45 }}>
                      {question}
                    </summary>
                    <p style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.93rem', marginTop: 10 }}>
                      {answer}
                    </p>
                  </details>
                ))}
              </div>

              {href && (
                <p style={{ marginTop: '0.9rem', fontSize: '0.86rem' }}>
                  <Link href={href} style={{ color: '#1B56A1', fontWeight: 600, textDecoration: 'none' }}>
                    Ver la página completa →
                  </Link>
                </p>
              )}
            </section>
          ))}

          {/* ── Municipios: se ENLAZAN, no se copian ── */}
          {/* Las respuestas viven en la página de cada municipio y allí tienen
              su contexto. Repetirlas aquí dentro de otro FAQPage crearía dos
              copias del mismo dato en el marcado. */}
          <section style={{ marginBottom: '2.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.6rem' }}>
              <MapPin size={19} color="#1B56A1" />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
                ¿Qué se pregunta sobre cada municipio del Gualivá?
              </h2>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', marginBottom: '1.1rem' }}>
              Cada municipio con página propia responde su altitud, su clima, su distancia a
              Bogotá y su inventario disponible. Su Finca Raíz cubre los{' '}
              {DATOS_OFICIALES.municipiosProvincia} de la provincia
              {disponibles > 0 ? `, con ${disponibles} propiedades publicadas hoy` : ''}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10 }}>
              {faqsMunicipios.map(f => (
                  <Link
                    key={f.slug}
                    href={`/municipios/${f.slug}`}
                    style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0.8rem 1rem', textDecoration: 'none', display: 'block' }}
                  >
                    <span style={{ display: 'block', color: '#0D2D5E', fontWeight: 700, fontSize: '0.9rem', marginBottom: 3 }}>{f.name}</span>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '0.78rem', lineHeight: 1.4 }}>{f.question}</span>
                  </Link>
              ))}
            </div>
          </section>

          {/* ── Veredas ── */}
          <section style={{ marginBottom: '2.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.6rem' }}>
              <Trees size={19} color="#1B56A1" />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
                ¿Qué se pregunta sobre cada vereda?
              </h2>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', marginBottom: '1.1rem' }}>
              {veredas.length} veredas con página propia: acceso vial, clima comparado con el casco
              urbano, cultivos que se dan, disponibilidad de agua y distancia real a Bogotá.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {veredas.map(v => (
                <Link
                  key={v.slug}
                  href={`/veredas/${v.slug}`}
                  style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '0.45rem 1rem', color: '#334155', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  {v.name} <span style={{ color: '#94A3B8', fontWeight: 400 }}>· {v.municipio_name}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Glosario ── */}
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.6rem' }}>
              <BookOpen size={19} color="#1B56A1" />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
                ¿Qué significan los términos del proceso de compra?
              </h2>
            </div>
            <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', marginBottom: '1rem' }}>
              El glosario define {GLOSARIO_TERMS.length} términos del mercado inmobiliario rural
              colombiano: certificado de tradición y libertad, folio de matrícula, arras, POT,
              impuesto de registro y derechos notariales, entre otros.
            </p>
            <Link href="/glosario" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '2px solid #0D2D5E', color: '#0D2D5E', fontWeight: 700, fontSize: '0.9rem', padding: '0.65rem 1.4rem', borderRadius: 10, textDecoration: 'none' }}>
              Ver el glosario <ChevronRight size={16} />
            </Link>
          </section>

          <p style={{ marginTop: '1.5rem', fontSize: '0.82rem', color: '#64748B' }}>
            Última actualización: <time dateTime={ACTUALIZADO}>13 de agosto de 2026</time>.
          </p>
        </div>
      </main>
    </>
  )
}
