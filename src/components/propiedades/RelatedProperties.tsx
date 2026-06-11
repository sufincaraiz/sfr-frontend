import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, MapPin } from 'lucide-react'
import { getRelatedProperties, type RelatedCard } from '@/lib/related-properties'
import { formatPrice } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  currentSlug:      string
  municipalityId:   string
  municipalitySlug: string
  municipalityName: string
  veredaId:         string | null
  type:             string
}

// ─── Main component ───────────────────────────────────────────────────────────

export async function RelatedProperties(props: Props) {
  const groups = await getRelatedProperties(props)

  const hasAny =
    groups.municipio.length > 0 ||
    groups.vereda.length > 0 ||
    groups.tipo.length > 0

  if (!hasAny) return null

  return (
    <section
      aria-label="Propiedades relacionadas"
      style={{ background: '#F1F5F9', borderTop: '1px solid #E2E8F0', paddingTop: '3rem', paddingBottom: '4rem' }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Section heading */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span style={{
            display: 'inline-block', background: '#1B56A1', color: '#fff',
            fontSize: '0.7rem', fontWeight: 800, padding: '3px 12px',
            borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
          }}>
            Explora más
          </span>
          <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)', margin: 0 }}>
            Propiedades similares
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

          {/* ── Grupo 1: mismo municipio ── */}
          {groups.municipio.length > 0 && (
            <RelatedGroup
              heading={`Más propiedades en ${groups.municipio_name}`}
              cards={groups.municipio}
              hubHref={`/municipios/${groups.municipio_slug}`}
              hubLabel={`Guía completa de ${groups.municipio_name}`}
              listHref={`/propiedades?municipio=${groups.municipio_slug}`}
              listLabel={`Ver todas las propiedades en ${groups.municipio_name}`}
            />
          )}

          {/* ── Grupo 2: misma vereda ── */}
          {groups.vereda.length > 0 && groups.vereda_slug && (
            <RelatedGroup
              heading={`Más propiedades en vereda ${groups.vereda_name ?? ''}`}
              cards={groups.vereda}
              hubHref={`/veredas/${groups.vereda_slug}`}
              hubLabel={`Todo sobre vereda ${groups.vereda_name ?? ''}`}
              listHref={`/propiedades?municipio=${groups.municipio_slug}`}
              listLabel={`Ver propiedades disponibles en ${groups.municipio_name}`}
            />
          )}

          {/* ── Grupo 3: mismo tipo ── */}
          {groups.tipo.length > 0 && (
            <RelatedGroup
              heading={`Más ${groups.tipo_label}s en venta`}
              cards={groups.tipo}
              hubHref={`/propiedades?tipo=${groups.tipo_slug}`}
              hubLabel={`Ver todos los ${groups.tipo_label.toLowerCase()}s disponibles`}
              listHref={`/propiedades?tipo=${groups.tipo_slug}`}
              listLabel={`Ver todos los ${groups.tipo_label.toLowerCase()}s en venta`}
            />
          )}

        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        .rel-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 1024px) { .rel-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 700px)  { .rel-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 420px)  { .rel-grid { grid-template-columns: 1fr; } }
        .rel-card:hover { box-shadow: 0 8px 24px rgba(13,45,94,0.13); transform: translateY(-3px); }
        .rel-card { transition: box-shadow 0.2s, transform 0.2s; }
        .rel-hub-link:hover { text-decoration: underline; }
        .rel-more-link:hover { background: #0D2D5E !important; }
      `}</style>
    </section>
  )
}

// ─── Group subcomponent ───────────────────────────────────────────────────────

function RelatedGroup({
  heading,
  cards,
  hubHref,
  hubLabel,
  listHref,
  listLabel,
}: {
  heading:   string
  cards:     RelatedCard[]
  hubHref:   string
  hubLabel:  string
  listHref:  string
  listLabel: string
}) {
  return (
    <div>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, marginBottom: '1rem',
      }}>
        <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1rem', margin: 0 }}>
          {heading}
        </h3>
        <Link
          href={hubHref}
          className="rel-hub-link"
          style={{
            color: '#1B56A1', fontSize: '0.82rem', fontWeight: 700,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {hubLabel} <ArrowRight size={13} />
        </Link>
      </div>

      {/* Cards */}
      <div className="rel-grid">
        {cards.map(card => (
          <PropertyCard key={card.slug} card={card} />
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
        <Link
          href={listHref}
          className="rel-more-link"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#1B56A1', color: '#fff',
            fontSize: '0.82rem', fontWeight: 700,
            padding: '8px 18px', borderRadius: 8,
            textDecoration: 'none', transition: 'background 0.2s',
          }}
        >
          {listLabel} <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

// ─── Property card ────────────────────────────────────────────────────────────

function PropertyCard({ card }: { card: RelatedCard }) {
  return (
    <Link
      href={`/propiedad/${card.slug}`}
      className="rel-card"
      style={{
        display: 'block', textDecoration: 'none',
        background: '#fff', borderRadius: 12,
        border: '1px solid #E2E8F0', overflow: 'hidden',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: '#E2E8F0' }}>
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.image_alt}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 700px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '2rem' }}>🏡</span>
          </div>
        )}
        {/* Type badge */}
        <span style={{
          position: 'absolute', top: 8, left: 8,
          background: '#0D2D5E', color: '#fff',
          fontSize: '0.65rem', fontWeight: 800,
          padding: '3px 8px', borderRadius: 20,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {card.type_label}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: '0.85rem 1rem' }}>
        {/* Title = anchor text (SEO) */}
        <p style={{
          color: '#0D2D5E', fontWeight: 700,
          fontSize: '0.87rem', lineHeight: 1.35,
          marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {card.title}
        </p>

        {/* Location */}
        <p style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: '#64748B', fontSize: '0.75rem', marginBottom: 8,
        }}>
          <MapPin size={11} style={{ flexShrink: 0 }} />
          {card.municipality_name}, Cundinamarca
        </p>

        {/* Price */}
        <p style={{
          color: '#1B56A1', fontWeight: 800, fontSize: '0.9rem',
          borderTop: '1px solid #F1F5F9', paddingTop: 8,
        }}>
          {formatPrice(card.price_cop)}
        </p>

        {/* Area chips */}
        {(card.area_lot_m2 ?? card.area_built_m2) && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {card.area_lot_m2 && (
              <span style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                color: '#475569', fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {card.area_lot_m2.toLocaleString('es-CO')} m² lote
              </span>
            )}
            {card.area_built_m2 && (
              <span style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                color: '#475569', fontSize: '0.7rem', fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {card.area_built_m2.toLocaleString('es-CO')} m² constr.
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
