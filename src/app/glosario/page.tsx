import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, BookOpen } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { GLOSARIO_TERMS, CATEGORY_LABELS, type GlosarioTerm } from '@/lib/glosario-data'
import { JsonLd, breadcrumbSchema, glossarySchema, webPageSchema } from '@/components/seo/JsonLd'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Glosario de Finca Raíz en Colombia — Términos Inmobiliarios | Su Finca Raíz',
  description:
    'Significado de los términos más importantes del mercado inmobiliario colombiano: ' +
    'certificado de tradición, escrituración, promesa de compraventa, arras, POT, ' +
    'avalúo catastral y más. Guía completa para compradores de finca raíz.',
  alternates: { canonical: `${SITE_URL}/glosario` },
  openGraph: {
    title: 'Glosario de Finca Raíz — Términos Inmobiliarios Colombia',
    description:
      'Definiciones claras de los términos que necesitas conocer antes de comprar finca raíz ' +
      'en Colombia: documentos, trámites, impuestos y tipos de propiedad.',
    url: `${SITE_URL}/glosario`,
    type: 'website',
    locale: 'es_CO',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlosarioPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Glosario', href: '/glosario' },
  ])

  const glossary = glossarySchema(
    GLOSARIO_TERMS.map(t => ({ term: t.term, definition: t.definition, slug: t.slug }))
  )

  const page = webPageSchema({
    url:                 `${SITE_URL}/glosario`,
    name:                'Glosario de Finca Raíz en Colombia | Su Finca Raíz',
    description:
      'Definiciones de los términos más importantes del mercado inmobiliario colombiano.',
    speakable_selectors: ['h1', '.sfr-speakable', '.glosario-def'],
    about_name:          'Finca raíz en Colombia',
  })

  // Group terms by category
  const byCategory = GLOSARIO_TERMS.reduce<Record<string, GlosarioTerm[]>>((acc, t) => {
    const key = t.category
    if (!acc[key]) acc[key] = []
    acc[key]!.push(t)
    return acc
  }, {})

  const categoryOrder: GlosarioTerm['category'][] = [
    'documentos', 'tramites', 'impuestos', 'tipos-propiedad', 'valuacion', 'geografia', 'normativa',
  ]

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={glossary} />
      <JsonLd data={page} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2rem,5vw,3.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <BookOpen size={22} style={{ color: '#E8B92F' }} />
              <span style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Guía de referencia
              </span>
            </div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.5rem)', lineHeight: 1.2, marginBottom: 14 }}>
              Glosario de Finca Raíz en Colombia
            </h1>
            <p className="sfr-speakable" style={{ color: 'rgba(255,255,255,0.82)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 700 }}>
              Todo lo que necesitas saber antes de comprar finca raíz en Colombia. Definiciones claras
              de documentos, trámites, impuestos y tipos de propiedad — explicadas sin jerga legal.
            </p>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Glosario</span>
        </nav>

        {/* ── Índice rápido ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
            <p style={{ color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Índice por categoría
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categoryOrder.map(cat => (
                <a
                  key={cat}
                  href={`#${cat}`}
                  style={{
                    display: 'inline-block',
                    background: '#F1F5F9', color: '#1B56A1',
                    fontSize: '0.82rem', fontWeight: 700,
                    padding: '5px 14px', borderRadius: 20,
                    textDecoration: 'none', border: '1px solid #E2E8F0',
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Términos por categoría ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 5rem' }}>
          {categoryOrder.map(cat => {
            const terms = byCategory[cat]
            if (!terms?.length) return null
            return (
              <section key={cat} id={cat} style={{ marginBottom: '3rem', scrollMarginTop: '5rem' }}>
                <h2 style={{
                  color: '#0D2D5E', fontWeight: 900,
                  fontSize: '1.15rem', marginBottom: '1.25rem',
                  paddingBottom: '0.6rem',
                  borderBottom: '2px solid #E2E8F0',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    display: 'inline-block', background: '#1B56A1', color: '#fff',
                    fontSize: '0.65rem', fontWeight: 800, padding: '2px 10px',
                    borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {terms.map(term => (
                    <article
                      key={term.slug}
                      id={term.slug}
                      style={{
                        background: '#fff', borderRadius: 14,
                        border: '1px solid #E2E8F0',
                        padding: '1.5rem 1.75rem',
                        scrollMarginTop: '5rem',
                      }}
                    >
                      <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>
                        {term.term}
                      </h3>
                      {term.also_known_as && (
                        <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginBottom: 10 }}>
                          También conocido como: {term.also_known_as.join(', ')}
                        </p>
                      )}
                      <p className="glosario-def sfr-speakable" style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.92rem', margin: 0 }}>
                        {term.definition}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        {/* ── CTA ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          padding: '3rem 1.5rem', marginTop: '2rem',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.2rem,2.5vw,1.6rem)', marginBottom: 12 }}>
            ¿Listo para comprar tu finca en La Vega?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24, fontSize: '0.95rem' }}>
            Nuestros asesores conocen cada vereda y te guían en cada paso del proceso.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/propiedades"
              style={{
                background: '#E8B92F', color: '#0D2D5E',
                fontWeight: 800, fontSize: '0.95rem',
                padding: '0.75rem 1.75rem', borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              Ver propiedades disponibles
            </Link>
            <Link
              href="/blog/guias-de-compra"
              style={{
                background: 'transparent', color: '#fff',
                fontWeight: 700, fontSize: '0.9rem',
                padding: '0.75rem 1.75rem', borderRadius: 10,
                textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.4)',
              }}
            >
              Guías de compra →
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
