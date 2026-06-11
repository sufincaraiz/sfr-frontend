import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Clock, Thermometer, ChevronRight, Home } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getAllMunicipiosData } from '@/lib/municipios-data'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Municipios del Gualivá, Cundinamarca | Su Finca Raíz',
  description:
    'Explora los mejores municipios del Gualivá para comprar finca raíz: La Vega, ' +
    'Villeta, Nocaima, Sasaima y más. Información de clima, turismo, inversión y ' +
    'propiedades disponibles cerca de Bogotá.',
  alternates: {
    canonical: `${SITE_URL}/municipios`,
  },
  openGraph: {
    title: 'Municipios del Gualivá, Cundinamarca | Su Finca Raíz',
    description:
      'Guía de municipios del Gualivá para inversión inmobiliaria: La Vega, Villeta, ' +
      'Nocaima, Sasaima y más, a menos de 2 horas de Bogotá.',
    url: `${SITE_URL}/municipios`,
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`,
        width: 1200,
        height: 630,
        alt: 'Municipios del Gualivá, Cundinamarca',
      },
    ],
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MunicipiosIndexPage() {
  const municipios = getAllMunicipiosData()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Municipios', href: '/municipios' },
  ])

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Municipios del Gualivá — Su Finca Raíz',
    url: `${SITE_URL}/municipios`,
    numberOfItems: municipios.length,
    itemListElement: municipios.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.name,
      url: `${SITE_URL}/municipios/${m.slug}`,
      description: m.descripcion_seo,
    })),
  }

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={itemListSchema} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          padding: 'clamp(3rem,8vw,5rem) 1.5rem',
          textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', background: '#E8B92F', color: '#0D2D5E',
            fontSize: '0.72rem', fontWeight: 800, padding: '4px 16px',
            borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase',
          }}>
            Región Gualivá · Cundinamarca
          </span>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,3rem)', lineHeight: 1.15, marginBottom: 16 }}>
            Municipios para invertir cerca de Bogotá
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7, fontSize: '1.05rem' }}>
            La Vega, Villeta, Nocaima, Sasaima y más. Todos a menos de 2 horas de Bogotá
            con fincas, lotes y casas campestres en clima primaveral.
          </p>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}>
            <Home size={13} /> Inicio
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Municipios</span>
        </nav>

        {/* ── Grid de municipios ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1rem 1.5rem 5rem' }}>
          <p style={{ color: '#475569', marginBottom: '2rem', fontSize: '0.95rem' }}>
            {municipios.length} municipios de la Provincia del Gualivá con propiedades disponibles
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {municipios.map((m, i) => (
              <Link
                key={m.slug}
                href={`/municipios/${m.slug}`}
                style={{ display: 'block', textDecoration: 'none' }}
                className="muni-card"
              >
                <article style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0D2D5E', overflow: 'hidden', flexShrink: 0 }}>
                    {m.og_image && (
                      <Image
                        src={m.og_image}
                        alt={`${m.name}, Cundinamarca`}
                        fill
                        style={{ objectFit: 'cover', opacity: 0.8 }}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={i < 3}
                      />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,45,94,0.7) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem', lineHeight: 1.2, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                          {m.name}
                        </h2>
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>Cundinamarca</span>
                      </div>
                      <span style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.7rem', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        Provincia {m.provincia}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.65, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {m.descripcion_seo}
                    </p>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <MiniStat icon={<Clock size={12} />} value={`${m.tiempo_bogota_min} min`} label="Bogotá" />
                      <MiniStat icon={<Thermometer size={12} />} value={`${m.temperatura_c.min}–${m.temperatura_c.max}°C`} label="Temperatura" />
                      <MiniStat icon={<MapPin size={12} />} value={`${m.altitud_msnm.toLocaleString('es-CO')} m`} label="Altitud" />
                    </div>

                    {/* CTA */}
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: '#1B56A1', fontWeight: 700, fontSize: '0.85rem',
                      }}>
                        Ver propiedades en {m.name} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <style>{`
        .muni-card article {
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .muni-card:hover article {
          box-shadow: 0 8px 28px rgba(13,45,94,0.13);
          transform: translateY(-3px);
        }
      `}</style>
    </>
  )
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.78rem' }}>
      <span style={{ color: '#1B56A1' }}>{icon}</span>
      <span style={{ fontWeight: 700, color: '#334155' }}>{value}</span>
      <span style={{ color: '#94A3B8' }}>{label}</span>
    </div>
  )
}
