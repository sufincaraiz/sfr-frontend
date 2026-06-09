'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bed, Bath, Maximize2, MapPin, Eye } from 'lucide-react';
import { formatPrice, TYPE_LABELS } from '@/lib/utils';
import type { Property } from '@/types';

interface Props {
  properties: Property[];
}

export function PropiedadesGrid({ properties }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current || properties.length === 0) return;
    let cleanup: (() => void) | undefined;

    import('gsap').then(({ gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        const cards = gridRef.current?.querySelectorAll('.prop-card');
        if (!cards) return;
        gsap.fromTo(cards,
          { opacity: 0, y: 32, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.5,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: { trigger: gridRef.current, start: 'top 85%', once: true },
          }
        );
        cleanup = () => ScrollTrigger.getAll().forEach(t => t.kill());
      });
    });
    return () => cleanup?.();
  }, [properties]);

  if (properties.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '5rem 2rem',
        background: '#F8FAFC', borderRadius: 16,
        border: '2px dashed #CBD5E1',
      }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</p>
        <h3 style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.5rem' }}>
          No encontramos propiedades con estos filtros
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
          Intenta ampliar los criterios de búsqueda o{' '}
          <a href="/propiedades" style={{ color: '#1B56A1', fontWeight: 600 }}>ver todas las propiedades</a>.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {properties.map((p, i) => <PropCard key={p.id} property={p} priority={i < 3} />)}
    </div>
  );
}

function PropCard({ property: p, priority }: { property: Property; priority?: boolean }) {
  const img      = p.media?.find(m => m.is_primary) ?? p.media?.[0];
  const typeLabel = TYPE_LABELS[p.type] ?? p.type;
  const href     = `/propiedad/${p.slug}`;

  return (
    <div className="prop-card" style={{ opacity: 0 }}>
      <Link
        href={href}
        style={{
          display: 'block',
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          border: '1px solid #F1F5F9',
          transition: 'box-shadow 0.25s, transform 0.25s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(27,86,161,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        aria-label={`Ver ${p.title ?? typeLabel}`}
      >
        {/* Imagen */}
        <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', background: '#EFF6FF' }}>
          {img ? (
            <Image
              src={img.url}
              alt={img.alt_text || `${p.title} — Su Finca Raíz`}
              fill
              sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
              style={{ objectFit: 'cover', transition: 'transform 0.5s' }}
              priority={priority}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1' }}>
              <Maximize2 size={48} />
            </div>
          )}

          {/* Badges */}
          <span style={{
            position: 'absolute', top: 12, left: 12,
            background: '#1B56A1', color: '#fff',
            fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          }}>
            {typeLabel}
          </span>

          <span style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(13,45,94,0.85)', color: '#E8B92F',
            fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20,
          }}>
            Disponible
          </span>

          {/* Hover CTA */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(27,86,161,0.7)', opacity: 0,
            transition: 'opacity 0.3s',
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
          >
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#E8B92F', color: '#0D2D5E',
              fontWeight: 700, fontSize: '0.85rem',
              padding: '10px 22px', borderRadius: 8,
            }}>
              <Eye size={15} /> Explorar propiedad
            </span>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '1rem 1.1rem 1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>
            <MapPin size={12} />
            {p.municipality?.name ?? 'La Vega'}, Cundinamarca
          </div>

          <h3 style={{
            color: '#0D2D5E', fontWeight: 700, fontSize: '1rem',
            lineHeight: 1.35, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {p.title ?? `${typeLabel} en ${p.municipality?.name ?? 'La Vega'}`}
          </h3>

          <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '1.15rem', marginBottom: 10 }}>
            {formatPrice(p.price_cop)}
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
            {p.bedrooms > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bed size={13} />{p.bedrooms} hab.</span>
            )}
            {p.bathrooms > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Bath size={13} />{p.bathrooms} baños</span>
            )}
            {p.area_lot_m2 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Maximize2 size={13} />{p.area_lot_m2.toLocaleString('es-CO')} m²</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
