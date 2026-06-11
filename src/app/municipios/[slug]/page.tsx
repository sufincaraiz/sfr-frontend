import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home, ChevronRight, MapPin, Thermometer, Clock, TrendingUp, Mountain, Trees, Building2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { getMunicipioData, getAllMunicipiosData } from '@/lib/municipios-data'
import { JsonLd, breadcrumbSchema, faqSchema, webPageSchema } from '@/components/seo/JsonLd'
import { formatPrice, TYPE_LABELS } from '@/lib/utils'
import type { Property, PropertyMedia } from '@/types'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const data = getAllMunicipiosData()
  return data.map(m => ({ slug: m.slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const m = getMunicipioData(slug)
  if (!m) return { title: 'Municipio no encontrado | Su Finca Raíz' }

  const title = `Fincas y Propiedades en ${m.name}, Cundinamarca | Su Finca Raíz`
  const description = m.descripcion_seo

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/municipios/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/municipios/${slug}`,
      type: 'website',
      locale: 'es_CO',
      images: m.og_image
        ? [{ url: `${SITE_URL}${m.og_image}`, width: 1200, height: 630, alt: `${m.name}, Cundinamarca` }]
        : [],
    },
  }
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getMunicipalityProperties(municipioSlug: string) {
  const muni = await prisma.municipality.findFirst({
    where: { slug: municipioSlug },
  })
  if (!muni) return { muni: null, properties: [] }

  const raw = await prisma.property.findMany({
    where: { municipality_id: muni.id, status: 'available' },
    orderBy: { published_at: 'desc' },
    take: 6,
    include: {
      municipality: true,
      media: { where: { is_primary: true }, take: 1 },
    },
  })

  const properties: (Property & { media: PropertyMedia[] })[] = raw.map(r => ({
    id: r.id,
    slug: r.slug,
    type: r.type as Property['type'],
    transaction_type: 'venta',
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

  return { muni, properties }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MunicipioPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const data = getMunicipioData(slug)
  if (!data) notFound()

  const { properties } = await getMunicipalityProperties(slug)

  const canonicalUrl = `${SITE_URL}/municipios/${slug}`

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Municipios', href: '/municipios' },
    { name: data.name, href: `/municipios/${slug}` },
  ])

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'City',
    '@id': `${canonicalUrl}#place`,
    name: data.name,
    url: canonicalUrl,
    description: data.descripcion_seo,
    sameAs: [
      data.wikipedia_url,
      `https://www.wikidata.org/wiki/Special:Search/${encodeURIComponent(data.name + ' Cundinamarca')}`,
    ],
    containedInPlace: {
      '@type': 'AdministrativeArea',
      name: 'Cundinamarca',
      sameAs: 'https://es.wikipedia.org/wiki/Cundinamarca',
      containedInPlace: {
        '@type': 'Country',
        name: 'Colombia',
        sameAs: 'https://es.wikipedia.org/wiki/Colombia',
      },
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: data.geo_lat,
      longitude: data.geo_lng,
    },
  }

  const pageSchema = webPageSchema({
    url:                 canonicalUrl,
    name:               `Fincas y Propiedades en ${data.name}, Cundinamarca | Su Finca Raíz`,
    description:         data.descripcion_seo,
    speakable_selectors: ['h1', '.sfr-speakable'],
    about_name:         `${data.name}, Cundinamarca`,
    about_same_as:       data.wikipedia_url,
  })

  const TIPO_LINKS = [
    { slug: 'fincas-en-venta', label: 'Fincas en Venta' },
    { slug: 'lotes-en-venta', label: 'Lotes en Venta' },
    { slug: 'casas-campestres-en-venta', label: 'Casas Campestres' },
    { slug: 'condominios-campestres', label: 'Condominios' },
  ]

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={placeSchema} />
      <JsonLd data={pageSchema} />
      <JsonLd data={faqSchema(data.faqs)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', width: '100%', height: 'clamp(240px, 40vw, 480px)', overflow: 'hidden', background: '#0D2D5E' }}>
          {data.og_image && (
            <Image
              src={data.og_image}
              alt={`${data.name}, Cundinamarca — vista aérea`}
              fill
              priority
              style={{ objectFit: 'cover', opacity: 0.7 }}
              sizes="100vw"
            />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,45,94,0.3) 0%, rgba(13,45,94,0.75) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(1.5rem,4vw,3rem)', maxWidth: 900 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#E8B92F', color: '#0D2D5E',
              fontSize: '0.72rem', fontWeight: 800, padding: '4px 14px',
              borderRadius: 20, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase',
            }}>
              <MapPin size={12} /> Provincia del {data.provincia}
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.8rem)', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)', marginBottom: 10 }}>
              Fincas y Propiedades en {data.name}
              <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 500, opacity: 0.85, marginTop: 4 }}>
                Cundinamarca, Colombia
              </span>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, color: 'rgba(255,255,255,0.88)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} /> {data.tiempo_bogota_min} min de Bogotá
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mountain size={13} /> {data.altitud_msnm.toLocaleString('es-CO')} msnm
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Thermometer size={13} /> {data.temperatura_c.min}–{data.temperatura_c.max} °C
              </span>
            </div>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/municipios" style={{ color: '#64748B', textDecoration: 'none' }}>Municipios</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{data.name}</span>
        </nav>

        {/* ── Cuerpo ── */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 5rem' }} className="municipio-layout">

          {/* ── COLUMNA PRINCIPAL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* Descripción + stats rápidas */}
            <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '2rem 2rem' }}>
              <p className="sfr-speakable" style={{ color: '#475569', lineHeight: 1.8, fontSize: '1rem', marginBottom: '1.5rem' }}>
                {data.descripcion_seo}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                <StatCard icon={<Clock size={18} />} label="Desde Bogotá" value={`${data.tiempo_bogota_min} min / ${data.distancia_bogota_km} km`} />
                <StatCard icon={<Mountain size={18} />} label="Altitud" value={`${data.altitud_msnm.toLocaleString('es-CO')} msnm`} />
                <StatCard icon={<Thermometer size={18} />} label="Temperatura" value={`${data.temperatura_c.min}–${data.temperatura_c.max} °C`} />
                <StatCard icon={<MapPin size={18} />} label="Provincia" value={data.provincia} />
              </div>
            </section>

            {/* Historia */}
            <Section title="Historia" icon={<Trees size={20} />}>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{data.historia}</p>
            </Section>

            {/* Clima */}
            <Section title="Clima" icon={<Thermometer size={20} />}>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{data.clima}</p>
            </Section>

            {/* Turismo */}
            <Section title="Turismo" icon={<Trees size={20} />}>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{data.turismo}</p>
            </Section>

            {/* Inversión inmobiliaria */}
            <Section title="Inversión Inmobiliaria" icon={<TrendingUp size={20} />} accent>
              <p style={{ color: '#475569', lineHeight: 1.8, fontSize: '0.95rem' }}>{data.inversion}</p>
              <Link
                href={`/propiedades?municipio=${data.name}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: '1.25rem',
                  background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Ver propiedades en {data.name} <ChevronRight size={16} />
              </Link>
            </Section>

            {/* Preguntas frecuentes — AEO / AI Overviews */}
            {data.faqs.length > 0 && (
              <section aria-labelledby={`faq-heading-${slug}`}>
                <SectionHeader title="Preguntas Frecuentes" icon={<span style={{ fontSize: '1.1rem' }}>❓</span>} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '1.25rem' }}>
                  {data.faqs.map((faq, i) => (
                    <details
                      key={i}
                      style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}
                    >
                      <summary style={{
                        cursor: 'pointer', padding: '1rem 1.25rem',
                        fontWeight: 700, color: '#0D2D5E', fontSize: '0.95rem',
                        listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        {faq.question}
                        <span style={{ color: '#1B56A1', fontSize: '1.2rem', lineHeight: 1, flexShrink: 0, marginLeft: 8 }}>+</span>
                      </summary>
                      <div style={{ padding: '0 1.25rem 1rem', color: '#475569', lineHeight: 1.75, fontSize: '0.9rem' }}>
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Propiedades relacionadas */}
            {properties.length > 0 && (
              <section>
                <SectionHeader title={`Propiedades disponibles en ${data.name}`} icon={<Building2 size={20} />} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                  {properties.map((p, i) => (
                    <PropCard key={p.id} property={p} priority={i < 3} />
                  ))}
                </div>
                {properties.length >= 6 && (
                  <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link
                      href={`/propiedades?municipio=${data.name}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        border: '2px solid #0D2D5E', color: '#0D2D5E',
                        fontWeight: 700, fontSize: '0.9rem',
                        padding: '0.65rem 1.5rem', borderRadius: 10, textDecoration: 'none',
                      }}
                    >
                      Ver todas las propiedades en {data.name} <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* ── SIDEBAR ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Tipos disponibles */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem' }}>
              <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Buscar por tipo
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TIPO_LINKS.map(t => (
                  <Link
                    key={t.slug}
                    href={`/${t.slug}-${slug}-cundinamarca`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid #E2E8F0',
                      color: '#334155', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
                      transition: 'all 0.15s',
                    }}
                    className="tipo-link"
                  >
                    {t.label} en {data.name} <ChevronRight size={14} style={{ color: '#94A3B8' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Datos rápidos */}
            <div style={{ background: '#0D2D5E', borderRadius: 16, padding: '1.5rem', color: '#fff' }}>
              <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5, color: '#E8B92F' }}>
                Datos del municipio
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <DataRow label="Departamento" value="Cundinamarca" />
                <DataRow label="Provincia" value={data.provincia} />
                <DataRow label="Altitud" value={`${data.altitud_msnm.toLocaleString('es-CO')} msnm`} />
                <DataRow label="Temperatura" value={`${data.temperatura_c.min}–${data.temperatura_c.max} °C`} />
                <DataRow label="Distancia Bogotá" value={`${data.distancia_bogota_km} km`} />
                <DataRow label="Tiempo en auto" value={`~${data.tiempo_bogota_min} minutos`} />
              </div>
            </div>

            {/* CTA contacto */}
            <div style={{ background: '#F0FDF4', borderRadius: 16, border: '1.5px solid #BBF7D0', padding: '1.5rem' }}>
              <p style={{ color: '#15803D', fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>
                ¿Buscas propiedad en {data.name}?
              </p>
              <p style={{ color: '#475569', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Te asesoramos sin costo. Conocemos todas las veredas y los mejores precios del mercado.
              </p>
              <a
                href={`https://wa.me/573218826730?text=Hola%2C+me+interesa+una+propiedad+en+${encodeURIComponent(data.name)}%2C+Cundinamarca`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  padding: '0.75rem', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Consultar por WhatsApp
              </a>
            </div>

          </aside>
        </div>
      </main>

      <style>{`
        .municipio-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 300px;
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .municipio-layout {
            grid-template-columns: 1fr !important;
          }
        }
        .tipo-link:hover {
          background: #F1F5F9;
          border-color: #CBD5E1;
        }
      `}</style>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9', padding: '0.8rem 1rem' }}>
      <span style={{ color: '#1B56A1', marginBottom: 4, display: 'block' }}>{icon}</span>
      <span style={{ color: '#94A3B8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 2 }}>{label}</span>
      <span style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.88rem' }}>{value}</span>
    </div>
  )
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <span style={{ color: '#1B56A1' }}>{icon}</span>
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>{title}</h2>
    </div>
  )
}

function Section({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <section style={{
      background: accent ? '#EFF6FF' : '#fff',
      borderRadius: 16,
      border: `1px solid ${accent ? '#BFDBFE' : '#E2E8F0'}`,
      padding: '1.75rem 2rem',
    }}>
      <SectionHeader title={title} icon={icon} />
      <div style={{ marginTop: '1rem' }}>{children}</div>
    </section>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <strong style={{ color: '#fff' }}>{value}</strong>
    </div>
  )
}

type PropProperty = Property & { media: PropertyMedia[] }

function PropCard({ property, priority }: { property: PropProperty; priority: boolean }) {
  const img = property.media?.find(m => m.is_primary) ?? property.media?.[0]
  const typeLabel = TYPE_LABELS[property.type] ?? property.type

  return (
    <Link
      href={`/propiedad/${property.slug}`}
      style={{ display: 'block', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0', textDecoration: 'none', transition: 'box-shadow 0.2s, transform 0.2s' }}
      className="prop-card"
    >
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#F1F5F9', overflow: 'hidden' }}>
        {img ? (
          <Image src={img.url} alt={img.alt_text || property.title || typeLabel} fill style={{ objectFit: 'cover' }} sizes="(max-width:640px) 100vw, 33vw" priority={priority} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#CBD5E1', fontSize: '2rem' }}>🏡</div>
        )}
        <span style={{ position: 'absolute', top: 10, left: 10, background: '#1B56A1', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
          {typeLabel}
        </span>
      </div>
      <div style={{ padding: '1rem' }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {property.title ?? `${typeLabel} en ${property.municipality?.name}`}
        </h3>
        <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '1rem', marginBottom: 8 }}>
          {formatPrice(property.price_cop)}
        </p>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
          {property.area_lot_m2 && <span>{property.area_lot_m2.toLocaleString('es-CO')} m²</span>}
          {property.bedrooms > 0 && <span>{property.bedrooms} hab.</span>}
          {property.bathrooms > 0 && <span>{property.bathrooms} baños</span>}
        </div>
      </div>
    </Link>
  )
}

// suppress hover style without CSS modules
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = `
  .prop-card:hover { box-shadow: 0 8px 24px rgba(13,45,94,0.12); transform: translateY(-2px); }
`
