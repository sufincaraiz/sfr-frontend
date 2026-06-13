import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Home, ChevronRight, MapPin, Thermometer, Clock,
  TrendingUp, CheckCircle, Building2, Mountain,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { getVeredaData, getAllVeredasData } from '@/lib/veredas-data'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd'
import { formatPrice, TYPE_LABELS } from '@/lib/utils'
import type { Property, PropertyMedia } from '@/types'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return getAllVeredasData().map(v => ({ slug: v.slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const v = getVeredaData(slug)
  if (!v) return { title: 'Vereda no encontrada | Su Finca Raíz' }

  const title = `Fincas y Lotes en Vereda ${v.name}, ${v.municipio_name}, Cundinamarca | Su Finca Raíz`

  return {
    title,
    description: v.descripcion_seo,
    alternates: { canonical: `${SITE_URL}/veredas/${slug}` },
    openGraph: {
      title,
      description: v.descripcion_seo,
      url: `${SITE_URL}/veredas/${slug}`,
      type: 'website',
      locale: 'es_CO',
      images: v.og_image
        ? [{ url: `${SITE_URL}${v.og_image}`, width: 1200, height: 630, alt: `Vereda ${v.name}, ${v.municipio_name}` }]
        : [],
    },
  }
}

// ─── Data ────────────────────────────────────────────────────────────────────

async function getVeredaProperties(municipioSlug: string) {
  const muni = await prisma.municipality.findFirst({ where: { slug: municipioSlug } })
  if (!muni) return []

  const raw = await prisma.property.findMany({
    where: { municipality_id: muni.id, status: 'available' },
    orderBy: { published_at: 'desc' },
    take: 4,
    include: {
      municipality: true,
      media: { where: { is_primary: true }, take: 1 },
    },
  })

  return raw.map(r => ({
    id: r.id,
    slug: r.slug,
    type: r.type as Property['type'],
    transaction_type: 'venta' as const,
    municipality_id: r.municipality_id,
    vereda_id: r.vereda_id,
    address_visible: r.address_visible,
    price_cop: Number(r.price_cop),
    area_lot_m2: r.area_lot_m2,
    area_built_m2: r.area_built_m2,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    parking: r.parking,
    year_built: r.year_built,
    status: r.status as Property['status'],
    geo_lat: r.geo_lat,
    geo_lng: r.geo_lng,
    published_at: r.published_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    title: r.title ?? undefined,
    short_description: r.short_description ?? undefined,
    municipality: r.municipality
      ? { id: r.municipality.id, slug: r.municipality.slug, name: r.municipality.name, province: r.municipality.province, demand_score: r.municipality.demand_score }
      : undefined,
    media: r.media as PropertyMedia[],
  }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VeredaPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const v = getVeredaData(slug)
  if (!v) notFound()

  const properties = await getVeredaProperties(v.municipio_slug)

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Veredas', href: '/veredas' },
    { name: `${v.name} — ${v.municipio_name}`, href: `/veredas/${slug}` },
  ])

  const faq = faqSchema(v.faq.map(f => ({ question: f.pregunta, answer: f.respuesta })))

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `Vereda ${v.name}`,
    description: v.descripcion_seo,
    url: `${SITE_URL}/veredas/${slug}`,
    containedInPlace: {
      '@type': 'City',
      name: v.municipio_name,
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: 'Cundinamarca',
        containedInPlace: { '@type': 'Country', name: 'Colombia' },
      },
    },
    ...(v.geo_lat && v.geo_lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: v.geo_lat, longitude: v.geo_lng } }
      : {}),
    hasMap: v.geo_lat && v.geo_lng
      ? `https://www.openstreetmap.org/?mlat=${v.geo_lat}&mlon=${v.geo_lng}&zoom=14`
      : undefined,
    amenityFeature: v.ventajas.map(va => ({
      '@type': 'LocationFeatureSpecification',
      name: va,
      value: true,
    })),
  }

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faq} />
      <JsonLd data={placeSchema} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', width: '100%', height: 'clamp(220px, 38vw, 460px)', overflow: 'hidden', background: '#0D2D5E' }}>
          {v.og_image && (
            <Image src={v.og_image} alt={`Vereda ${v.name}, ${v.municipio_name}`} fill priority style={{ objectFit: 'cover', opacity: 0.65 }} sizes="100vw" />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,45,94,0.25) 0%, rgba(13,45,94,0.8) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(1.25rem,4vw,2.75rem)', maxWidth: 860 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <Chip color="#E8B92F" text={`Vereda · ${v.municipio_name}`} />
              <Chip color="rgba(255,255,255,0.18)" text={`${v.distancia_bogota_min} min de Bogotá`} textColor="rgba(255,255,255,0.9)" border />
            </div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3.8vw,2.6rem)', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)', marginBottom: 10 }}>
              Fincas y Lotes en Vereda {v.name}
              <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 400, opacity: 0.85, marginTop: 4 }}>
                {v.municipio_name}, Cundinamarca, Colombia
              </span>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
              <HeroStat icon={<Clock size={13} />} label={`${v.distancia_pueblo_min} min al pueblo`} />
              <HeroStat icon={<Mountain size={13} />} label={`${v.altitud_msnm.toLocaleString('es-CO')} msnm`} />
              <HeroStat icon={<Thermometer size={13} />} label={`${v.temperatura_c.min}–${v.temperatura_c.max} °C`} />
              <HeroStat icon={<MapPin size={13} />} label={v.acceso_vial.split('.')[0] ?? v.acceso_vial} />
            </div>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/veredas" style={{ color: '#64748B', textDecoration: 'none' }}>Veredas</Link>
          <ChevronRight size={13} />
          <Link href={`/municipios/${v.municipio_slug}`} style={{ color: '#64748B', textDecoration: 'none' }}>{v.municipio_name}</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{v.name}</span>
        </nav>

        {/* ── Cuerpo ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }} className="vereda-layout">

          {/* ── COLUMNA PRINCIPAL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Descripción + stats */}
            <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.75rem 2rem' }}>
              <p style={{ color: '#475569', lineHeight: 1.85, fontSize: '1rem', marginBottom: '1.5rem' }}>
                {v.descripcion_seo}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 10 }}>
                <StatBox icon={<Clock size={17} />} label="Al pueblo" value={`${v.distancia_pueblo_min} min`} />
                <StatBox icon={<Clock size={17} />} label="A Bogotá" value={`${v.distancia_bogota_min} min`} />
                <StatBox icon={<Mountain size={17} />} label="Altitud" value={`${v.altitud_msnm.toLocaleString('es-CO')} msnm`} />
                <StatBox icon={<Thermometer size={17} />} label="Temperatura" value={`${v.temperatura_c.min}–${v.temperatura_c.max} °C`} />
              </div>
            </section>

            {/* Acceso vial */}
            <InfoSection title="Acceso Vial" icon={<MapPin size={19} />}>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{v.acceso_vial}</p>
            </InfoSection>

            {/* Clima */}
            <InfoSection title="Clima" icon={<Thermometer size={19} />}>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{v.clima}</p>
            </InfoSection>

            {/* Ventajas */}
            <InfoSection title="Ventajas para vivir en {v.name}" icon={<CheckCircle size={19} />} titleOverride={`Ventajas para vivir en ${v.name}`}>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.6rem', listStyle: 'none', padding: 0, margin: 0 }}>
                {v.ventajas.map((va, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: '#374151', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    <span style={{ color: '#15803D', flexShrink: 0, marginTop: 2 }}><CheckCircle size={15} /></span>
                    {va}
                  </li>
                ))}
              </ul>
            </InfoSection>

            {/* Valorización */}
            <InfoSection title="Potencial de Valorización" icon={<TrendingUp size={19} />} accent>
              <p style={{ color: '#1e40af', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '1.25rem' }}>{v.valorizacion}</p>
              <Link
                href={`/propiedades?municipio=${v.municipio_name}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#0D2D5E', color: '#fff', fontWeight: 700,
                  fontSize: '0.88rem', padding: '0.65rem 1.4rem',
                  borderRadius: 10, textDecoration: 'none',
                }}
              >
                Ver propiedades en {v.municipio_name} <ChevronRight size={15} />
              </Link>
            </InfoSection>

            {/* Propiedades */}
            {properties.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                  <Building2 size={19} style={{ color: '#1B56A1' }} />
                  <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
                    Propiedades disponibles cerca de {v.name}
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: '1.1rem' }}>
                  {properties.map((p, i) => <PropCard key={p.id} property={p} priority={i < 2} />)}
                </div>
                <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                  <Link
                    href={`/propiedades?municipio=${v.municipio_name}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      border: '2px solid #0D2D5E', color: '#0D2D5E', fontWeight: 700,
                      fontSize: '0.88rem', padding: '0.6rem 1.4rem',
                      borderRadius: 10, textDecoration: 'none',
                    }}
                  >
                    Ver más propiedades en {v.municipio_name} <ChevronRight size={15} />
                  </Link>
                </div>
              </section>
            )}

            {/* FAQ */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                <span style={{ color: '#1B56A1', fontSize: '1.2rem' }}>❓</span>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
                  Preguntas frecuentes sobre {v.name}
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {v.faq.map((item, i) => (
                  <details key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <summary style={{
                      padding: '1rem 1.25rem', fontWeight: 700, fontSize: '0.92rem',
                      color: '#0D2D5E', cursor: 'pointer', listStyle: 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      {item.pregunta}
                      <ChevronRight size={16} style={{ flexShrink: 0, color: '#94A3B8', transition: 'transform 0.2s' }} />
                    </summary>
                    <div style={{ padding: '0 1.25rem 1.1rem', color: '#475569', lineHeight: 1.75, fontSize: '0.88rem', borderTop: '1px solid #F1F5F9' }}>
                      {item.respuesta}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* Mapa aproximado */}
            {v.geo_lat && v.geo_lng && (
              <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', marginBottom: '1rem' }}>Ubicación aproximada</h2>
                <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                  <iframe
                    title={`Mapa vereda ${v.name}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${v.geo_lng - 0.02},${v.geo_lat - 0.02},${v.geo_lng + 0.02},${v.geo_lat + 0.02}&layer=mapnik&marker=${v.geo_lat},${v.geo_lng}`}
                    width="100%" height="300"
                    style={{ border: 'none', display: 'block' }}
                    loading="lazy"
                  />
                </div>
                <p style={{ color: '#94A3B8', fontSize: '0.73rem', marginTop: 6 }}>
                  * Ubicación referencial del centro de la vereda.
                </p>
              </section>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Datos rápidos */}
            <div style={{ background: '#0D2D5E', borderRadius: 16, padding: '1.5rem', color: '#fff' }}>
              <p style={{ fontWeight: 800, fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5, color: '#E8B92F' }}>
                Datos de la vereda
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: '0.83rem' }}>
                <SideRow label="Vereda" value={v.name} />
                <SideRow label="Municipio" value={v.municipio_name} />
                <SideRow label="Departamento" value="Cundinamarca" />
                <SideRow label="Altitud" value={`${v.altitud_msnm.toLocaleString('es-CO')} msnm`} />
                <SideRow label="Temperatura" value={`${v.temperatura_c.min}–${v.temperatura_c.max} °C`} />
                <SideRow label="Al pueblo" value={`~${v.distancia_pueblo_min} min`} />
                <SideRow label="A Bogotá" value={`~${v.distancia_bogota_min} min`} />
              </div>
            </div>

            {/* Municipio */}
            <Link href={`/municipios/${v.municipio_slug}`} style={{ display: 'block', background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem', textDecoration: 'none' }} className="muni-link">
              <p style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Municipio</p>
              <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{v.municipio_name}</p>
              <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 8 }}>
                Provincia del Gualivá · {v.distancia_bogota_min} min de Bogotá
              </p>
              <span style={{ color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                Ver guía completa <ChevronRight size={14} />
              </span>
            </Link>

            {/* Tipos de propiedad */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
              <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Buscar en {v.municipio_name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { label: `Fincas en ${v.municipio_name}`, href: `/propiedades?tipo=finca&municipio=${v.municipio_name}` },
                  { label: `Lotes en ${v.municipio_name}`, href: `/propiedades?tipo=lote&municipio=${v.municipio_name}` },
                  { label: `Casas campestres`, href: `/propiedades?tipo=casa&municipio=${v.municipio_name}` },
                  { label: `Ver todas las propiedades`, href: `/propiedades?municipio=${v.municipio_name}` },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.8rem', borderRadius: 8, border: '1px solid #F1F5F9', color: '#334155', fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', background: '#FAFAFA' }}>
                    {l.label} <ChevronRight size={13} style={{ color: '#94A3B8' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA WhatsApp */}
            <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1.5px solid #BBF7D0', padding: '1.4rem' }}>
              <p style={{ color: '#15803D', fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}>
                ¿Buscas propiedad en {v.name}?
              </p>
              <p style={{ color: '#475569', fontSize: '0.81rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>
                Conocemos cada predio disponible en la vereda. Te asesoramos sin costo y sin compromiso.
              </p>
              <a
                href={`https://wa.me/573218826730?text=Hola%2C+busco+propiedad+en+la+vereda+${encodeURIComponent(v.name)}%2C+${encodeURIComponent(v.municipio_name)}%2C+Cundinamarca`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                  padding: '0.7rem', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Consultar por WhatsApp
              </a>
            </div>

            {/* Otras veredas */}
            <VeredasCercanas currentSlug={slug} municipioSlug={v.municipio_slug} municipioName={v.municipio_name} />
          </aside>
        </div>
      </main>

      <style>{`
        .vereda-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 290px;
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .vereda-layout { grid-template-columns: 1fr !important; }
        }
        details[open] summary > svg { transform: rotate(90deg); }
        .muni-link:hover { box-shadow: 0 4px 16px rgba(13,45,94,0.1); }
      `}</style>
    </>
  )
}

// ─── Otras veredas del mismo municipio ───────────────────────────────────────

function VeredasCercanas({ currentSlug, municipioSlug, municipioName }: { currentSlug: string; municipioSlug: string; municipioName: string }) {
  // imported inline to avoid another server call
  const { getVeredasByMunicipio } = require('@/lib/veredas-data') as typeof import('@/lib/veredas-data')
  const otras = getVeredasByMunicipio(municipioSlug).filter(v => v.slug !== currentSlug).slice(0, 5)
  if (!otras.length) return null

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
      <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Más veredas en {municipioName}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {otras.map(v => (
          <Link key={v.slug} href={`/veredas/${v.slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid #F1F5F9', color: '#334155', fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', background: '#FAFAFA' }}>
            {v.name} <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ color, text, textColor, border }: { color: string; text: string; textColor?: string; border?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: color, color: textColor ?? '#0D2D5E',
      fontSize: '0.7rem', fontWeight: 800,
      padding: '3px 12px', borderRadius: 20,
      letterSpacing: 0.8, textTransform: 'uppercase',
      border: border ? '1px solid rgba(255,255,255,0.3)' : undefined,
    }}>
      {text}
    </span>
  )
}

function HeroStat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{icon}{label}</span>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9', padding: '0.75rem 1rem' }}>
      <span style={{ color: '#1B56A1', display: 'block', marginBottom: 3 }}>{icon}</span>
      <span style={{ color: '#94A3B8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>{label}</span>
      <span style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.88rem' }}>{value}</span>
    </div>
  )
}

function InfoSection({ title, titleOverride, icon, children, accent }: {
  title: string; titleOverride?: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean
}) {
  return (
    <section style={{
      background: accent ? '#EFF6FF' : '#fff',
      borderRadius: 16, border: `1px solid ${accent ? '#BFDBFE' : '#E2E8F0'}`,
      padding: '1.6rem 2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
        <span style={{ color: '#1B56A1' }}>{icon}</span>
        <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>{titleOverride ?? title}</h2>
      </div>
      {children}
    </section>
  )
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 7 }}>
      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>{label}</span>
      <strong style={{ color: '#fff', fontSize: '0.82rem' }}>{value}</strong>
    </div>
  )
}

type P = Property & { media: PropertyMedia[] }

function PropCard({ property, priority }: { property: P; priority: boolean }) {
  const img = property.media?.[0]
  const typeLabel = TYPE_LABELS[property.type] ?? property.type
  return (
    <Link href={`/propiedad/${property.slug}`} style={{ display: 'block', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', textDecoration: 'none' }} className="prop-card">
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#F1F5F9', overflow: 'hidden' }}>
        {img
          ? <Image src={img.url} alt={img.alt_text || property.title || typeLabel} fill style={{ objectFit: 'cover' }} sizes="(max-width:640px) 100vw, 33vw" priority={priority} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CBD5E1', fontSize: '2rem' }}>🏡</div>
        }
        <span style={{ position: 'absolute', top: 10, left: 10, background: '#1B56A1', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
          {typeLabel}
        </span>
      </div>
      <div style={{ padding: '0.9rem 1rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.4, marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {property.title ?? `${typeLabel} en ${property.municipality?.name}`}
        </h3>
        <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '0.95rem', marginBottom: 6 }}>
          {formatPrice(property.price_cop)}
        </p>
        <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
          {property.area_lot_m2 && <span>{property.area_lot_m2.toLocaleString('es-CO')} m²</span>}
          {property.bedrooms > 0 && <span>{property.bedrooms} hab.</span>}
          {property.bathrooms > 0 && <span>{property.bathrooms} baños</span>}
        </div>
      </div>
    </Link>
  )
}
