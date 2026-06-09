import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import Image from 'next/image';
import Link from 'next/link';
import { Home, MapPin, Bed, Bath, Car, Maximize2, Layers, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatPrice, TYPE_LABELS } from '@/lib/utils';
import { GaleriaLightbox } from '@/components/propiedades/GaleriaLightbox';
import { FormContactoPropiedad } from '@/components/propiedades/FormContactoPropiedad';
import type { Property, PropertyMedia, PropertyFeature } from '@/types';

// ─── helpers ────────────────────────────────────────────────────────────────

async function getProperty(slug: string) {
  const raw = await prisma.property.findUnique({
    where: { slug },
    include: {
      municipality: true,
      media:        { orderBy: { order: 'asc' } },
      features:     true,
    },
  });
  if (!raw) return null;

  const p: Property & { features: PropertyFeature[] } = {
    id:               raw.id,
    slug:             raw.slug,
    type:             raw.type as Property['type'],
    transaction_type: 'venta',
    municipality_id:  raw.municipality_id,
    vereda_id:        raw.vereda_id,
    address_visible:  raw.address_visible,
    price_cop:        Number(raw.price_cop),
    area_lot_m2:      raw.area_lot_m2,
    area_built_m2:    raw.area_built_m2,
    bedrooms:         raw.bedrooms,
    bathrooms:        raw.bathrooms,
    parking:          raw.parking,
    year_built:       raw.year_built,
    status:           raw.status as Property['status'],
    geo_lat:          raw.geo_lat,
    geo_lng:          raw.geo_lng,
    published_at:     raw.published_at.toISOString(),
    updated_at:       raw.updated_at.toISOString(),
    title:            raw.title ?? undefined,
    short_description: raw.short_description ?? undefined,
    meta_title:       raw.meta_title ?? undefined,
    meta_description: raw.meta_description ?? undefined,
    municipality:     raw.municipality ?? undefined,
    media:            raw.media as PropertyMedia[],
    features:         raw.features as PropertyFeature[],
  };
  return p;
}

// ─── SSG ────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs = await prisma.property.findMany({ select: { slug: true }, where: { status: 'available' } });
  return slugs.map(s => ({ slug: s.slug }));
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) return { title: 'Propiedad no encontrada | Su Finca Raíz' };

  const title = p.meta_title ?? p.title ?? `${TYPE_LABELS[p.type]} en ${p.municipality?.name ?? 'La Vega'}`;
  const description = p.meta_description ?? p.short_description ?? `${TYPE_LABELS[p.type]} en venta en ${p.municipality?.name ?? 'La Vega'}, Cundinamarca. ${formatPrice(p.price_cop)}.`;
  const img = p.media?.find(m => m.is_primary) ?? p.media?.[0];

  return {
    title: `${title} | Su Finca Raíz`,
    description,
    alternates: {
      canonical: `${SITE_URL}/propiedad/${slug}`,
    },
    openGraph: {
      title: `${title} | Su Finca Raíz`,
      description,
      url: `${SITE_URL}/propiedad/${slug}`,
      images: img ? [{ url: img.url, width: 1200, height: 630 }] : [],
      type: 'website',
      locale: 'es_CO',
    },
  };
}

// ─── Feature helpers ─────────────────────────────────────────────────────────

function feat(features: PropertyFeature[], key: string) {
  return features.find(f => f.feature_key === key)?.feature_value ?? null;
}

const SERVICIOS_LABELS: Record<string, string> = {
  agua: 'Agua', energia: 'Energía', gas: 'Gas natural', internet: 'Internet',
  alcantarillado: 'Alcantarillado', telefono: 'Teléfono', acueducto: 'Acueducto',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function PropiedadDetallePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) notFound();

  const typeLabel  = TYPE_LABELS[p.type] ?? p.type;
  const muni       = p.municipality?.name ?? 'La Vega';
  const title      = p.title ?? `${typeLabel} en ${muni}`;
  const banner     = p.media?.find(m => m.is_primary) ?? p.media?.[0];

  // Features
  const features   = p.features ?? [];
  const clima      = feat(features, 'clima');
  const altitud    = feat(features, 'altitud');
  const distParque = feat(features, 'distancia_parque');
  const descripcion = feat(features, 'descripcion') ?? p.short_description ?? '';

  // Servicios públicos
  const serviciosKeys = ['agua', 'energia', 'gas', 'internet', 'alcantarillado', 'telefono', 'acueducto'];
  const serviciosActivos = serviciosKeys.filter(k => {
    const v = feat(features, k);
    return v && v !== 'no' && v !== 'false' && v !== '0';
  });

  // Tour 360
  const tour = p.media?.find(m => m.type === 'tour360' && m.tour360_embed_url);

  // Schema.org
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: descripcion || p.short_description,
    url: `${SITE_URL}/propiedad/${p.slug}`,
    image: banner?.url,
    offers: {
      '@type': 'Offer',
      price: p.price_cop,
      priceCurrency: 'COP',
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: muni,
      addressRegion: 'Cundinamarca',
      addressCountry: 'CO',
    },
    ...(p.geo_lat && p.geo_lng ? {
      geo: { '@type': 'GeoCoordinates', latitude: p.geo_lat, longitude: p.geo_lng },
    } : {}),
    numberOfRooms: p.bedrooms || undefined,
    floorSize: p.area_built_m2 ? { '@type': 'QuantitativeValue', value: p.area_built_m2, unitCode: 'MTK' } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero banner ── */}
        {banner && (
          <div style={{ position: 'relative', width: '100%', height: 'clamp(260px, 45vw, 520px)', overflow: 'hidden' }}>
            <Image
              src={banner.url}
              alt={banner.alt_text || title}
              fill
              priority
              style={{ objectFit: 'cover' }}
              sizes="100vw"
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,45,94,0.35) 0%, rgba(13,45,94,0.65) 100%)' }} />

            {/* Overlay title */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(1.5rem,4vw,3rem)', maxWidth: 900 }}>
              <span style={{ display: 'inline-block', background: '#1B56A1', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                {typeLabel}
              </span>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.4rem)', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.4)', marginBottom: 8 }}>
                {title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                <MapPin size={14} /> {muni}, Cundinamarca
              </div>
            </div>
          </div>
        )}

        {/* ── Breadcrumb ── */}
        <nav style={{ maxWidth: 1280, margin: '0 auto', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/propiedades" style={{ color: '#64748B', textDecoration: 'none' }}>Propiedades</Link>
          <ChevronRight size={13} />
          <Link href={`/propiedades?municipio=${muni}`} style={{ color: '#64748B', textDecoration: 'none' }}>{muni}</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{title}</span>
        </nav>

        {/* ── Cuerpo: 2 columnas ── */}
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem 4rem',
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 340px',
          gap: '2.5rem',
          alignItems: 'start',
        }}
          className="propiedad-grid"
        >

          {/* ───────────── COLUMNA PRINCIPAL ───────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Galería */}
            {p.media && p.media.filter(m => m.type === 'image').length > 0 && (
              <section>
                <GaleriaLightbox media={p.media} />
              </section>
            )}

            {/* Ficha rápida */}
            <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem' }}>
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.25rem' }}>Características</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {p.area_lot_m2 && (
                  <Ficha icon={<Maximize2 size={18} />} label="Área terreno" value={`${p.area_lot_m2.toLocaleString('es-CO')} m²`} />
                )}
                {p.area_built_m2 && (
                  <Ficha icon={<Layers size={18} />} label="Área construida" value={`${p.area_built_m2.toLocaleString('es-CO')} m²`} />
                )}
                {p.bedrooms > 0 && (
                  <Ficha icon={<Bed size={18} />} label="Habitaciones" value={String(p.bedrooms)} />
                )}
                {p.bathrooms > 0 && (
                  <Ficha icon={<Bath size={18} />} label="Baños" value={String(p.bathrooms)} />
                )}
                {p.parking > 0 && (
                  <Ficha icon={<Car size={18} />} label="Parqueaderos" value={String(p.parking)} />
                )}
                {clima && (
                  <Ficha icon={<span style={{ fontSize: '1.1rem' }}>🌡️</span>} label="Clima" value={clima} />
                )}
                {altitud && (
                  <Ficha icon={<span style={{ fontSize: '1.1rem' }}>⛰️</span>} label="Altitud" value={altitud} />
                )}
                {distParque && (
                  <Ficha icon={<span style={{ fontSize: '1.1rem' }}>📍</span>} label="Al parque principal" value={distParque} />
                )}
              </div>
            </section>

            {/* Descripción */}
            {descripcion && (
              <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Descripción</h2>
                <div style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                  {descripcion}
                </div>
              </section>
            )}

            {/* Servicios públicos */}
            {serviciosActivos.length > 0 && (
              <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Servicios públicos</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {serviciosActivos.map(k => (
                    <span key={k} style={{
                      background: '#F0FDF4', color: '#15803D', border: '1.5px solid #BBF7D0',
                      borderRadius: 20, padding: '5px 14px', fontSize: '0.82rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      ✓ {SERVICIOS_LABELS[k] ?? k}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Mapa OpenStreetMap */}
            {p.geo_lat && p.geo_lng && (
              <section style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Ubicación aproximada</h2>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <iframe
                    title="Mapa de ubicación"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${p.geo_lng - 0.01},${p.geo_lat - 0.01},${p.geo_lng + 0.01},${p.geo_lat + 0.01}&layer=mapnik&marker=${p.geo_lat},${p.geo_lng}`}
                    width="100%"
                    height="320"
                    style={{ border: 'none', display: 'block' }}
                    loading="lazy"
                  />
                </div>
                <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: 6 }}>
                  * La ubicación en el mapa es aproximada para proteger la privacidad del propietario.
                </p>
              </section>
            )}

            {/* Tour 360 */}
            {tour?.tour360_embed_url && (
              <section style={{ background: '#0D2D5E', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 1.75rem 1rem' }}>
                  <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    Experiencia inmersiva
                  </p>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>Tour Virtual 360°</h2>
                </div>
                <iframe
                  src={tour.tour360_embed_url}
                  title="Tour 360° de la propiedad"
                  width="100%"
                  height="480"
                  style={{ border: 'none', display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                />
              </section>
            )}

            {/* CTA móvil — solo visible en pantallas pequeñas */}
            <div className="sidebar-mobile">
              <FormContactoPropiedad
                propertyTitle={title}
                propertySlug={p.slug}
                price={p.price_cop}
              />
            </div>

          </div>

          {/* ───────────── SIDEBAR ───────────── */}
          <aside style={{ position: 'sticky', top: '5.5rem' }} className="sidebar-desktop">
            <FormContactoPropiedad
              propertyTitle={title}
              propertySlug={p.slug}
              price={p.price_cop}
            />

            {/* Tags extra */}
            <div style={{ marginTop: '1rem', background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
              <p style={{ color: '#64748B', fontSize: '0.78rem', fontWeight: 700, marginBottom: 8 }}>DETALLES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tipo</span><strong style={{ color: '#0D2D5E' }}>{typeLabel}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Municipio</span><strong style={{ color: '#0D2D5E' }}>{muni}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Transacción</span><strong style={{ color: '#0D2D5E' }}>Venta</strong>
                </div>
                {p.year_built && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Año</span><strong style={{ color: '#0D2D5E' }}>{p.year_built}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estado</span><strong style={{ color: '#15803D' }}>Disponible</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .propiedad-grid {
            grid-template-columns: 1fr !important;
          }
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile  { display: block !important; }
        }
        @media (min-width: 769px) {
          .sidebar-desktop { display: block !important; }
          .sidebar-mobile  { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ─── Ficha item ──────────────────────────────────────────────────────────────

function Ficha({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      background: '#F8FAFC', borderRadius: 10, padding: '0.8rem 1rem',
      border: '1px solid #F1F5F9',
    }}>
      <span style={{ color: '#1B56A1', marginBottom: 2 }}>{icon}</span>
      <span style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.95rem' }}>{value}</span>
    </div>
  );
}
