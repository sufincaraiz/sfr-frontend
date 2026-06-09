'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { PropertyMedia } from '@/types';

interface Props { media: PropertyMedia[] }

export function GaleriaLightbox({ media }: Props) {
  const [open, setOpen]   = useState(false);
  const [idx,  setIdx]    = useState(0);

  const imgs = media.filter(m => m.type === 'image');
  const banner = imgs[0];
  const rest   = imgs.slice(1, 7); // máx 6 en grid

  const prev = useCallback(() => setIdx(i => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % imgs.length), [imgs.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      { setOpen(false); }
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, prev, next]);

  if (!banner) return null;

  const openAt = (i: number) => { setIdx(i); setOpen(true); };

  return (
    <>
      {/* Banner + grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto', gap: 4, borderRadius: 16, overflow: 'hidden' }}>
        {/* Banner principal */}
        <div
          style={{ gridRow: rest.length > 0 ? 'span 2' : '1', position: 'relative', aspectRatio: rest.length > 0 ? 'auto' : '16/9', minHeight: 320, cursor: 'pointer' }}
          onClick={() => openAt(0)}
        >
          <Image src={banner.url} alt={banner.alt_text || 'Propiedad'} fill style={{ objectFit: 'cover' }} priority sizes="(max-width:768px) 100vw,60vw" />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
          >
            <ZoomIn color="#fff" size={28} style={{ opacity: 0, transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            />
          </div>
        </div>

        {/* Grid de miniaturas */}
        {rest.map((m, i) => (
          <div key={m.id} style={{ position: 'relative', aspectRatio: '4/3', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openAt(i + 1)}>
            <Image src={m.url} alt={m.alt_text || `Foto ${i + 2}`} fill style={{ objectFit: 'cover', transition: 'transform 0.3s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)')}
              onMouseLeave={e => ((e.currentTarget as HTMLImageElement).style.transform = 'scale(1)')}
              sizes="30vw"
            />
            {/* +N overlay en la última miniatura */}
            {i === rest.length - 1 && imgs.length > 7 && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,45,94,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                +{imgs.length - 7}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botón "ver todas" */}
      {imgs.length > 1 && (
        <button
          onClick={() => openAt(0)}
          style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', border: '1.5px solid #CBD5E1', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#0D2D5E',
          }}
        >
          <ZoomIn size={14} /> Ver todas las fotos ({imgs.length})
        </button>
      )}

      {/* Lightbox */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Cerrar */}
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={22} />
          </button>

          {/* Prev */}
          {imgs.length > 1 && (
            <button onClick={prev} style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Imagen */}
          <div style={{ position: 'relative', width: '90vw', maxWidth: 1100, height: '80vh' }}>
            {imgs[idx] && (
              <Image
                src={imgs[idx].url}
                alt={imgs[idx].alt_text || `Foto ${idx + 1}`}
                fill
                style={{ objectFit: 'contain' }}
                sizes="90vw"
              />
            )}
          </div>

          {/* Next */}
          {imgs.length > 1 && (
            <button onClick={next} style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <ChevronRight size={24} />
            </button>
          )}

          {/* Counter */}
          <span style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
            {idx + 1} / {imgs.length}
          </span>
        </div>
      )}
    </>
  );
}
