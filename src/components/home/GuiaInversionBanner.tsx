import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';

export function GuiaInversionBanner() {
  return (
    <section style={{ padding: '3.5rem 1.5rem', background: '#fff' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
          borderRadius: 20,
          padding: 'clamp(1.75rem, 4vw, 2.75rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
          boxShadow: '0 14px 40px rgba(13,45,94,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 380px' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 14, background: 'rgba(232,185,47,0.18)',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={28} color="#E8B92F" />
          </span>
          <div>
            <p style={{ color: '#E8B92F', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              ¿Pensando en invertir en Cundinamarca?
            </p>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(1.2rem, 2.6vw, 1.6rem)', lineHeight: 1.3, margin: 0 }}>
              Descubre los secretos de rentabilidad en nuestra Guía Definitiva.
            </h2>
          </div>
        </div>

        <Link
          href="/guia-inversion"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#E8B92F', color: '#0D2D5E', fontWeight: 800,
            fontSize: '0.95rem', padding: '14px 28px', borderRadius: 12,
            textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Ver la Guía de Inversión <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
