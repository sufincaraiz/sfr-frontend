'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import type { PropertyMedia } from '@/types';

interface Props { media: PropertyMedia[] }

const SWIPE_THRESHOLD = 55; // px para cambiar de foto

export function GaleriaLightbox({ media }: Props) {
  const [open, setOpen] = useState(false);
  const [idx,  setIdx]  = useState(0);
  const [dragDx, setDragDx] = useState(0);
  const dragging = useRef<{ startX: number; dx: number; active: boolean }>({ startX: 0, dx: 0, active: false });
  const stripRef = useRef<HTMLDivElement>(null);

  const imgs = media.filter(m => m.type === 'image');
  const banner = imgs[0];
  const rest   = imgs.slice(1, 7); // máx 6 en el grid de preview

  const prev = useCallback(() => setIdx(i => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % imgs.length), [imgs.length]);

  // Teclado + bloqueo de scroll mientras el visor está abierto
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     setOpen(false);
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, prev, next]);

  // Auto-centrar la miniatura activa en la tira, con animación
  useEffect(() => {
    if (!open) return;
    const el = stripRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [idx, open]);

  if (!banner) return null;

  const openAt = (i: number) => { setIdx(i); setOpen(true); };

  // ── Swipe / arrastre (Pointer Events: unifica touch + mouse) ──
  const onDown = (e: React.PointerEvent) => {
    if (imgs.length < 2) return;
    dragging.current = { startX: e.clientX, dx: 0, active: true };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* algunos navegadores/edge cases */ }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current.active) return;
    const dx = e.clientX - dragging.current.startX;
    dragging.current.dx = dx;      // ref = fuente de verdad para onUp
    setDragDx(dx);                 // estado = solo para el feedback visual
  };
  const onUp = () => {
    if (!dragging.current.active) return;
    const dx = dragging.current.dx; // siempre el último delta, sin depender del re-render
    dragging.current.active = false;
    setDragDx(0);
    if (dx > SWIPE_THRESHOLD) prev();
    else if (dx < -SWIPE_THRESHOLD) next();
  };

  return (
    <>
      {/* Banner + grid de preview */}
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

      {/* ── Visor / carrusel táctil ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Barra superior: contador + cerrar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, background: 'rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: 999 }}>
              {idx + 1} / {imgs.length}
            </span>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <X size={22} />
            </button>
          </div>

          {/* Área principal: imagen con swipe/arrastre + flechas */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imgs.length > 1 && (
              <button onClick={prev} aria-label="Anterior" style={arrowStyle('left')}>
                <ChevronLeft size={26} />
              </button>
            )}

            <div
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{
                position: 'relative', width: '92vw', maxWidth: 1200, height: '100%',
                touchAction: 'none', cursor: imgs.length > 1 ? (dragging.current.active ? 'grabbing' : 'grab') : 'default',
                transform: `translateX(${dragDx}px)`,
                transition: dragging.current.active ? 'none' : 'transform 0.2s ease',
              }}
            >
              {imgs[idx] && (
                <Image
                  src={imgs[idx].url}
                  alt={imgs[idx].alt_text || `Foto ${idx + 1}`}
                  fill
                  priority
                  draggable={false}
                  style={{ objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }}
                  sizes="92vw"
                />
              )}
            </div>

            {imgs.length > 1 && (
              <button onClick={next} aria-label="Siguiente" style={arrowStyle('right')}>
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {/* Tira de miniaturas (animada, lazy, tap para saltar) */}
          {imgs.length > 1 && (
            <div
              ref={stripRef}
              style={{
                flexShrink: 0, display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
              }}
            >
              {imgs.map((m, i) => {
                const activa = i === idx;
                return (
                  <button
                    key={m.id}
                    onClick={() => setIdx(i)}
                    aria-label={`Ir a la foto ${i + 1}`}
                    style={{
                      position: 'relative', flexShrink: 0, width: 78, height: 56, borderRadius: 8, overflow: 'hidden',
                      border: activa ? '2px solid #E8B92F' : '2px solid transparent',
                      opacity: activa ? 1 : 0.55, cursor: 'pointer', padding: 0, background: '#111',
                      transform: activa ? 'scale(1)' : 'scale(0.94)', transition: 'opacity 0.2s, transform 0.2s, border-color 0.2s',
                    }}
                  >
                    <Image src={m.url} alt="" fill loading="lazy" style={{ objectFit: 'cover' }} sizes="78px" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function arrowStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 10,
    zIndex: 2, background: 'rgba(255,255,255,0.14)', border: 'none', borderRadius: '50%',
    width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
  } as React.CSSProperties;
}
