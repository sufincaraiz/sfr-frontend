import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/site';
import { ogImageUrl, ogImageMeta } from '@/lib/og-image';
import Image from 'next/image';
import Link from 'next/link';
import { Home, MapPin, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { tipoLabel } from '@/lib/property-types';
import { getTipoLabels } from '@/lib/property-types.server';
import { urlDeMunicipio } from '@/lib/cobertura';
import { getAllVeredasData } from '@/lib/veredas-data';
import { GaleriaLightbox } from '@/components/propiedades/GaleriaLightbox';
import { Modelo3D } from '@/components/propiedades/Modelo3D';
import { FormContactoPropiedad } from '@/components/propiedades/FormContactoPropiedad';
import { JsonLd, breadcrumbSchema, propertySchema } from '@/components/seo/JsonLd';
import { DatosVerificables } from '@/components/aeo/DatosVerificables';
import { RelatedProperties } from '@/components/propiedades/RelatedProperties';
import type { Property, PropertyMedia, PropertyFeature } from '@/types';

// ISR: además de la revalidación on-demand al editar en el admin, la ficha se
// regenera al menos cada hora como red de seguridad.
export const revalidate = 3600;

// ─── helpers ────────────────────────────────────────────────────────────────

async function getProperty(slug: string) {
  const raw = await prisma.property.findUnique({
    where: { slug },
    include: {
      municipality: true,
      vereda:       true,
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
    vereda:           raw.vereda ?? undefined,
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
    video_url:        raw.video_url ?? null,
    virtual_tour_url: raw.virtual_tour_url ?? null,
    modelo3d_url:     raw.modelo3d_url ?? null,
    municipality:     raw.municipality ?? undefined,
    media:            raw.media as PropertyMedia[],
    features:         raw.features as PropertyFeature[],
  };
  return p;
}

// Convierte una URL de YouTube (watch, youtu.be, shorts, embed) a su URL de embed
function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// ─── SSG ────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const slugs = await prisma.property.findMany({ select: { slug: true }, where: { status: 'available' } });
    return slugs.map(s => ({ slug: s.slug }));
  } catch (err) {
    console.warn('[generateStaticParams /propiedad/[slug]] BD no disponible en build; se generará bajo demanda:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProperty(slug);
  if (!p) return { title: 'Propiedad no encontrada' };

  // La marca la agrega la plantilla del layout; si el meta_title guardado en BD ya
  // la trae al final (importaciones antiguas), la recortamos para no duplicarla.
  const labels = await getTipoLabels();
  const rawTitle = p.meta_title ?? p.title ?? `${tipoLabel(p.type, labels)} en ${p.municipality?.name ?? 'La Vega'}`;
  const title = rawTitle.replace(/\s*\|\s*Su Finca Ra[íi]z\s*$/i, '').trim();
  const description = p.meta_description ?? p.short_description ?? `${tipoLabel(p.type, labels)} en venta en ${p.municipality?.name ?? 'La Vega'}, Cundinamarca. ${formatPrice(p.price_cop)}.`;
  // Portada de la propiedad para la preview al compartir. `ogImageUrl` la
  // reduce a 1200x630 (los originales pesan ~400-500 KB y WhatsApp los descarta)
  // y cae a la imagen del sitio si la propiedad no tuviera fotos.
  const img = p.media?.find(m => m.is_primary) ?? p.media?.[0];
  const ogImage = ogImageUrl(img?.url);
  const ogTitle = `${title} | Su Finca Raíz`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/propiedad/${slug}`,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: `${SITE_URL}/propiedad/${slug}`,
      images: ogImageMeta(img?.url, img?.alt_text || title),
      type: 'website',
      locale: 'es_CO',
    },
    // Sin este bloque se heredaba el twitter:image del layout (la panorámica
    // genérica de La Vega), que es a lo que caían los scrapers.
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      images: [ogImage],
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

  const typeLabel  = tipoLabel(p.type, await getTipoLabels());
  const muni       = p.municipality?.name ?? 'La Vega';
  // Enlaza a la página del municipio SOLO si está publicada; si no, al catálogo
  // filtrado. Sin esta guarda, una propiedad de un municipio sin contenido —hoy
  // Albán— apuntaría a /municipios/alban, que devuelve 404. Además codifica el
  // parámetro, que antes iba con el espacio literal ("?municipio=La Vega").
  const urlMuni    = await urlDeMunicipio(muni, p.municipality?.slug ?? '');
  // La vereda llega en la MISMA consulta de la ficha (include), no en una
  // aparte: con pool de 5 conexiones, una consulta extra por ficha agota el
  // pool durante el prerender de 167 paginas (P2024). Se filtra aqui por las
  // que tienen pagina, que es la guarda contra enlazar a un 404.
  const conPagina  = new Set(getAllVeredasData().map(v => v.slug));
  const vereda     = p.vereda && conPagina.has(p.vereda.slug) ? p.vereda : null;
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

  // Tour 360 — preferimos la columna dedicada; fallback a media tipo tour360
  const tourUrl = p.virtual_tour_url ?? p.media?.find(m => m.type === 'tour360' && m.tour360_embed_url)?.tour360_embed_url ?? null;
  // Video de YouTube (si la propiedad lo tiene)
  const youtubeUrl = youtubeEmbedUrl(p.video_url);
  // Modelo 3D (fotogrametría .glb) — solo si la propiedad lo tiene
  const modelo3dUrl = p.modelo3d_url ?? null;

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Propiedades', href: '/propiedades' },
    { name: title, href: `/propiedad/${p.slug}` },
  ])

  const listing = propertySchema({
    title,
    slug:          p.slug,
    description:   descripcion || p.short_description || '',
    price_cop:     p.price_cop,
    status:        p.status,
    bedrooms:      p.bedrooms ?? 0,
    bathrooms:     p.bathrooms ?? 0,
    area_built_m2: p.area_built_m2,
    area_lot_m2:   p.area_lot_m2,
    geo_lat:       p.geo_lat,
    geo_lng:       p.geo_lng,
    city:          muni,
    images:        p.media?.map(m => m.url) ?? [],
    published_at:  p.published_at,
    updated_at:    p.updated_at,
  })

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={listing} />

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
          <Link href={urlMuni} style={{ color: '#64748B', textDecoration: 'none' }}>{muni}</Link>
          {vereda && (
            <>
              <ChevronRight size={13} />
              <Link href={`/veredas/${vereda.slug}`} style={{ color: '#64748B', textDecoration: 'none' }}>
                Vereda {vereda.name}
              </Link>
            </>
          )}
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

            {/* Tour 360 — entre la galería y Características */}
            {tourUrl && (
              <section style={{ background: '#0D2D5E', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 1.75rem 1rem' }}>
                  <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    Experiencia inmersiva
                  </p>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>Tour Virtual 360°</h2>
                </div>
                <iframe
                  src={tourUrl}
                  title="Tour 360° de la propiedad"
                  width="100%"
                  height="480"
                  style={{ border: 'none', display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                />
              </section>
            )}

            {/* Modelo 3D — debajo del tour 360 */}
            {modelo3dUrl && (
              <section style={{ background: '#0D2D5E', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 1.75rem 1rem' }}>
                  <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    Vista 3D
                  </p>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>Modelo 3D del terreno</h2>
                </div>
                <Modelo3D src={modelo3dUrl} alt={`Modelo 3D de ${title}`} />
              </section>
            )}

            {/* ── Ficha técnica ──────────────────────────────────────────────
                Era una rejilla de <div> con iconos: se ve igual que una tabla
                para una persona y es ruido para una máquina, porque la relación
                etiqueta→valor solo existe en la posición visual. <table> la hace
                explícita en el marcado, que es lo que un modelo extrae.

                Se sustituye en vez de añadirse debajo: publicar los mismos
                datos dos veces en la misma página es peor producto y, además,
                dos copias del mismo dato son dos copias que pueden divergir.

                Ningún campo se pierde: los tres de contexto del municipio
                —clima, altitud y distancia al parque— siguen aquí. Se suman
                tipo y municipio, que estaban en el hero pero no como dato
                tabulado, y que son justo lo que un modelo necesita para
                responder «¿qué apartamentos hay en La Vega?».

                Sin tamanoMuestra a propósito: este no es un dato estadístico
                sino la ficha de UN inmueble, y ahí la muestra no significa
                nada. La fecha de corte es la de la última actualización real
                del registro, no la de hoy. */}
            <section>
              <DatosVerificables
                titulo={`Ficha técnica: ${title} — ${muni}, Cundinamarca`}
                fechaCorte={p.updated_at.slice(0, 10)}
                fuente="Ficha del inmueble registrada por Su Finca Raíz"
                metodologia={
                  'Datos del inmueble tal como están registrados en el catálogo de Su Finca ' +
                  'Raíz. Las áreas se expresan en metros cuadrados y la ubicación publicada ' +
                  'en el mapa es aproximada.'
                }
                filas={[
                  { etiqueta: 'Tipo de propiedad', valor: typeLabel },
                  { etiqueta: 'Municipio',         valor: `${muni}, Cundinamarca` },
                  // La vereda solo aparece cuando esta asignada. Es el dato que
                  // convierte «en La Vega» en «en la vereda El Cural», que es
                  // como se busca en el territorio.
                  ...(vereda ? [{ etiqueta: 'Vereda', valor: vereda.name }] : []),
                  ...(p.area_lot_m2
                    ? [{ etiqueta: 'Área del terreno',  valor: p.area_lot_m2.toLocaleString('es-CO'),   unidad: 'm²' }]
                    : []),
                  ...(p.area_built_m2
                    ? [{ etiqueta: 'Área construida',   valor: p.area_built_m2.toLocaleString('es-CO'), unidad: 'm²' }]
                    : []),
                  ...(p.bedrooms  > 0 ? [{ etiqueta: 'Habitaciones',  valor: p.bedrooms }]  : []),
                  ...(p.bathrooms > 0 ? [{ etiqueta: 'Baños',         valor: p.bathrooms }] : []),
                  ...(p.parking   > 0 ? [{ etiqueta: 'Parqueaderos',  valor: p.parking }]   : []),
                  ...(clima      ? [{ etiqueta: 'Clima',              valor: clima }]      : []),
                  ...(altitud    ? [{ etiqueta: 'Altitud',            valor: altitud }]    : []),
                  ...(distParque ? [{ etiqueta: 'Al parque principal', valor: distParque }] : []),
                ]}
              />
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

            {/* Video de YouTube — solo si la propiedad lo tiene */}
            {youtubeUrl && (
              <section style={{ background: '#0D2D5E', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 1.75rem 1rem' }}>
                  <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 }}>
                    Video
                  </p>
                  <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>Recorrido en video</h2>
                </div>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
                  <iframe
                    src={youtubeUrl}
                    title="Video de la propiedad"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
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

      <RelatedProperties
        currentSlug={p.slug}
        municipalityId={p.municipality_id}
        municipalitySlug={p.municipality?.slug ?? ''}
        municipalityName={muni}
        veredaId={p.vereda_id}
        type={p.type}
      />

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

