import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Clock, Thermometer, ChevronRight, Home } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getAllVeredasData, getVeredasByMunicipio } from '@/lib/veredas-data'
import { getMunicipioData } from '@/lib/municipios-data'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Veredas del Gualivá, Cundinamarca — Finca Raíz | Su Finca Raíz',
  description:
    'Guía completa de las veredas de La Vega, Sasaima y el Gualivá para inversión ' +
    'en finca raíz: Bulucaima, El Cural, Guarumal, Tabacal y más. Clima, acceso, ' +
    'ventajas y propiedades disponibles en cada vereda.',
  alternates: { canonical: `${SITE_URL}/veredas` },
  openGraph: {
    title: 'Veredas del Gualivá — Finca Raíz | Su Finca Raíz',
    description:
      'Guía de veredas para comprar finca raíz en La Vega y el Gualivá, Cundinamarca. ' +
      'Bulucaima, Guarumal, El Cural, Tabacal y más a menos de 2 horas de Bogotá.',
    url: `${SITE_URL}/veredas`,
    type: 'website',
    locale: 'es_CO',
    images: [
      {
        url: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`,
        width: 1200, height: 630,
        alt: 'Veredas del Gualivá, Cundinamarca',
      },
    ],
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VeredasIndexPage() {
  const todasVeredas = getAllVeredasData()

  // Agrupar por municipio
  const municipios = [...new Set(todasVeredas.map(v => v.municipio_slug))]

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Veredas', href: '/veredas' },
  ])

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Veredas del Gualivá — Finca Raíz',
    url: `${SITE_URL}/veredas`,
    numberOfItems: todasVeredas.length,
    itemListElement: todasVeredas.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Vereda ${v.name}, ${v.municipio_name}`,
      url: `${SITE_URL}/veredas/${v.slug}`,
      description: v.descripcion_seo,
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
          padding: 'clamp(2.5rem,7vw,4.5rem) 1.5rem',
          textAlign: 'center',
        }}>
          <span style={{
            display: 'inline-block', background: '#E8B92F', color: '#0D2D5E',
            fontSize: '0.7rem', fontWeight: 800, padding: '4px 16px',
            borderRadius: 20, marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase',
          }}>
            Búsqueda Hiperlocal · Región Gualivá
          </span>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,3.8vw,2.9rem)', lineHeight: 1.15, marginBottom: 14 }}>
            Veredas de La Vega y el Gualivá
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 580, margin: '0 auto', lineHeight: 1.7, fontSize: '1rem' }}>
            Encuentra tu parcela ideal por vereda. Cada una tiene su microclima,
            acceso y perfil de inversión único a menos de 2 horas de Bogotá.
          </p>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}>
            <Home size={13} /> Inicio
          </Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Veredas</span>
        </nav>

        {/* ── Contenido ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>

          <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
            {todasVeredas.length} veredas mapeadas en {municipios.length} municipios del Gualivá
          </p>

          {/* Por municipio */}
          {municipios.map(muniSlug => {
            const veredas = getVeredasByMunicipio(muniSlug)
            const muni = getMunicipioData(muniSlug)
            if (!veredas.length) return null

            return (
              <div key={muniSlug} style={{ marginBottom: '3.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
                    <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: '1.2rem', margin: 0 }}>
                      Veredas de {muni?.name ?? muniSlug}
                    </h2>
                    <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                      {veredas.length} veredas
                    </span>
                  </div>
                  <Link href={`/municipios/${muniSlug}`} style={{ color: '#1B56A1', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Guía de {muni?.name ?? muniSlug} <ChevronRight size={14} />
                  </Link>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {veredas.map((v, i) => (
                    <Link key={v.slug} href={`/veredas/${v.slug}`} style={{ display: 'block', textDecoration: 'none' }} className="vereda-card">
                      <article style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Imagen */}
                        <div style={{ position: 'relative', aspectRatio: '16/8', background: '#0D2D5E', overflow: 'hidden', flexShrink: 0 }}>
                          {v.og_image && (
                            <Image
                              src={v.og_image}
                              alt={`Vereda ${v.name}, ${v.municipio_name}`}
                              fill
                              style={{ objectFit: 'cover', opacity: 0.75 }}
                              sizes="(max-width: 640px) 100vw, 50vw"
                              priority={i < 4}
                            />
                          )}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,45,94,0.75) 0%, transparent 55%)' }} />
                          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                            <p style={{ color: '#fff', fontWeight: 900, fontSize: '1.05rem', margin: 0, textShadow: '0 1px 5px rgba(0,0,0,0.4)' }}>{v.name}</p>
                            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.73rem', margin: '2px 0 0' }}>{v.municipio_name}, Cundinamarca</p>
                          </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            {v.descripcion_seo}
                          </p>

                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            <MiniStat icon={<Clock size={11} />} value={`${v.distancia_bogota_min} min`} label="Bogotá" />
                            <MiniStat icon={<Thermometer size={11} />} value={`${v.temperatura_c.min}–${v.temperatura_c.max}°C`} label="" />
                            <MiniStat icon={<MapPin size={11} />} value={`${v.altitud_msnm.toLocaleString('es-CO')} m`} label="alt." />
                          </div>

                          {/* Acceso vial badge */}
                          <span style={{
                            display: 'inline-block', fontSize: '0.72rem', fontWeight: 700,
                            padding: '3px 10px', borderRadius: 20,
                            background: v.acceso_vial.toLowerCase().includes('paviment') ? '#F0FDF4' : '#FFF7ED',
                            color: v.acceso_vial.toLowerCase().includes('paviment') ? '#15803D' : '#C2410C',
                            border: `1px solid ${v.acceso_vial.toLowerCase().includes('paviment') ? '#BBF7D0' : '#FDBA74'}`,
                            alignSelf: 'flex-start',
                          }}>
                            {v.acceso_vial.toLowerCase().includes('paviment') ? '✓ Vía pavimentada' : '~ Vía en afirmado'}
                          </span>

                          <span style={{ color: '#1B56A1', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                            Ver fincas y lotes <ChevronRight size={13} />
                          </span>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        .vereda-card article { transition: box-shadow 0.2s, transform 0.2s; }
        .vereda-card:hover article { box-shadow: 0 8px 24px rgba(13,45,94,0.12); transform: translateY(-3px); }
      `}</style>
    </>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', fontSize: '0.76rem' }}>
      <span style={{ color: '#1B56A1' }}>{icon}</span>
      <span style={{ fontWeight: 700, color: '#334155' }}>{value}</span>
      {label && <span style={{ color: '#94A3B8' }}>{label}</span>}
    </div>
  )
}
