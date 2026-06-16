'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { MapPin, MessageCircle, ChevronLeft, ChevronRight, X, Images } from 'lucide-react';
import { CATEGORIAS, type Business, waLink, fotosDe } from '@/lib/directorio';

export function DirectorioClient({ businesses }: { businesses: Business[] }) {
  const [cat, setCat]   = useState<string>('Todos');
  const [muni, setMuni] = useState<string>('Todos');
  // Lightbox: fotos del negocio abierto + índice activo
  const [lightbox, setLightbox] = useState<{ fotos: string[]; nombre: string; i: number } | null>(null);

  const municipios = useMemo(
    () => ['Todos', ...Array.from(new Set(businesses.map(b => b.municipio))).sort()],
    [businesses],
  );

  const filtered = businesses.filter(
    b => (cat === 'Todos' || b.categoria === cat) && (muni === 'Todos' || b.municipio === muni),
  );

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
    border: active ? '1.5px solid #1B56A1' : '1.5px solid #E2E8F0',
    background: active ? '#1B56A1' : '#fff', color: active ? '#fff' : '#475569', transition: 'all .15s',
  });

  const mover = useCallback((dir: number) => {
    setLightbox(lb => lb ? { ...lb, i: (lb.i + dir + lb.fotos.length) % lb.fotos.length } : lb);
  }, []);

  // Navegación con teclado + bloqueo de scroll mientras el lightbox está abierto
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      else if (e.key === 'ArrowRight') mover(1);
      else if (e.key === 'ArrowLeft') mover(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [lightbox, mover]);

  return (
    <>
      {/* Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Categoría</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Todos', ...CATEGORIAS].map(c => (
              <button key={c} onClick={() => setCat(c)} style={tabBtn(cat === c)}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8 }}>Municipio</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {municipios.map(m => (
              <button key={m} onClick={() => setMuni(m)} style={tabBtn(muni === m)}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#94A3B8', background: '#fff', borderRadius: 16, border: '2px dashed #CBD5E1' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</p>
          No hay negocios con estos filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
          {filtered.map(b => {
            const wa = waLink(b.whatsapp, b.nombre);
            const fotos = fotosDe(b);
            return (
              <article key={b.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 12px rgba(13,45,94,0.05)' }}>
                {/* Foto / portada (clic abre el slider) */}
                <button
                  type="button"
                  onClick={() => fotos.length && setLightbox({ fotos, nombre: b.nombre, i: 0 })}
                  disabled={!fotos.length}
                  aria-label={fotos.length ? `Ver fotos de ${b.nombre}` : undefined}
                  style={{ position: 'relative', aspectRatio: '4/3', background: '#EFF6FF', overflow: 'hidden', border: 'none', padding: 0, width: '100%', cursor: fotos.length ? 'zoom-in' : 'default', display: 'block' }}
                >
                  {fotos[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={fotos[0]} alt={b.nombre} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '2rem' }}>🏪</div>}
                  <span style={{ position: 'absolute', top: 12, left: 12, background: '#1B56A1', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>{b.categoria}</span>
                  {fotos.length > 1 && (
                    <span style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(13,45,94,0.78)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 999 }}>
                      <Images size={12} /> {fotos.length}
                    </span>
                  )}
                </button>

                {/* Contenido */}
                <div style={{ padding: '1.1rem 1.2rem 1.3rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.25, margin: 0 }}>{b.nombre}</h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', fontSize: '0.8rem', fontWeight: 600, margin: '6px 0 0' }}>
                    <MapPin size={13} /> {b.municipio}
                  </p>

                  {b.descripcion && (
                    <p style={{ color: '#475569', fontSize: '0.86rem', lineHeight: 1.5, margin: '10px 0 0' }}>{b.descripcion}</p>
                  )}

                  {b.domicilios && (
                    <span style={{ alignSelf: 'flex-start', marginTop: 12, background: '#F0FDF4', color: '#15803D', border: '1.5px solid #BBF7D0', borderRadius: 999, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 800 }}>
                      🛵 Domicilios Disponibles
                    </span>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: '1.1rem' }}>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.85rem', padding: '10px', borderRadius: 10, textDecoration: 'none' }}>
                        <MessageCircle size={16} /> WhatsApp
                      </a>
                    )}
                    {b.google_maps_url && (
                      <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ flex: wa ? '0 0 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#0D2D5E', border: '1.5px solid #E2E8F0', fontWeight: 700, fontSize: '0.85rem', padding: '10px 14px', borderRadius: 10, textDecoration: 'none' }}>
                        <MapPin size={16} /> {wa ? '' : 'Ubicación'}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox / slider de fotos */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,17,33,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          {/* Cerrar */}
          <button onClick={() => setLightbox(null)} aria-label="Cerrar" style={{ position: 'absolute', top: 18, right: 18, width: 44, height: 44, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={22} />
          </button>

          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 920, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.fotos[lightbox.i]} alt={`${lightbox.nombre} — foto ${lightbox.i + 1}`} style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />

            {lightbox.fotos.length > 1 && (
              <>
                <button onClick={() => mover(-1)} aria-label="Anterior" style={navBtn('left')}><ChevronLeft size={26} /></button>
                <button onClick={() => mover(1)} aria-label="Siguiente" style={navBtn('right')}><ChevronRight size={26} /></button>

                {/* Puntos indicadores */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {lightbox.fotos.map((_, idx) => (
                    <button key={idx} onClick={() => setLightbox(lb => lb ? { ...lb, i: idx } : lb)} aria-label={`Foto ${idx + 1}`}
                      style={{ width: idx === lightbox.i ? 26 : 9, height: 9, borderRadius: 999, border: 'none', background: idx === lightbox.i ? '#E8B92F' : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all .2s' }} />
                  ))}
                </div>
              </>
            )}

            <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
              {lightbox.nombre}{lightbox.fotos.length > 1 ? ` · ${lightbox.i + 1} / ${lightbox.fotos.length}` : ''}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function navBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: -6,
    width: 46, height: 46, borderRadius: 999, border: 'none',
    background: 'rgba(255,255,255,0.16)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  } as React.CSSProperties;
}
