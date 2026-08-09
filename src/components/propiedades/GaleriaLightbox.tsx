'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import cloudinaryLoader from '@/lib/cloudinary-loader';
import type { PropertyMedia } from '@/types';

interface Props { media: PropertyMedia[] }

// ─────────────────────────────────────────────────────────────────────────────
// El visor a pantalla completa usa yet-another-react-lightbox, la misma librería
// que ya movía el lightbox de eventos. Sustituye a un carrusel propio que tenía
// dos problemas de raíz:
//
//   • Renderizaba UNA sola foto (`imgs[idx]`), así que la descarga empezaba en el
//     momento del deslizamiento y el usuario se comía la latencia entera. Aquí
//     `preload: 2` mantiene 5 slides montados (2 atrás, la actual y 2 adelante),
//     de modo que al deslizar la siguiente foto ya está descargada.
//
//   • Ponía `touch-action: none` y leía `e.clientX` de un único puntero, así que
//     un pellizco de dos dedos se interpretaba como arrastre y cambiaba de foto.
//     El plugin Zoom distingue un dedo (navegar) de dos (ampliar) por sí solo.
//
// ANCHO DE LAS FOTOS: solo dos variantes, móvil y escritorio. Medimos que una
// transformación nueva de Cloudinary tarda ~1.3 s en generarse y ~20 ms una vez
// cacheada; pedir un ancho distinto por cada tamaño de pantalla fragmentaría la
// caché y multiplicaría esas esperas en frío. Con dos anchos, ambos se calientan
// enseguida y se quedan así. Los originales rondan los 1080 px y `c_limit` no
// agranda, de modo que 1280 entrega la foto completa sin pesar de más.
// ─────────────────────────────────────────────────────────────────────────────

const ANCHO_MOVIL = 828;
const ANCHO_ESCRITORIO = 1280;

export function GaleriaLightbox({ media }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [ancho, setAncho] = useState(ANCHO_ESCRITORIO);

  const imgs = useMemo(() => media.filter(m => m.type === 'image'), [media]);
  const banner = imgs[0];
  const rest = imgs.slice(1, 7); // máx 6 en el grid de preview

  // El ancho se decide una vez, en el cliente. En el servidor no hay viewport,
  // y de todos modos el visor solo existe tras una interacción.
  useEffect(() => {
    const px = window.innerWidth * (window.devicePixelRatio || 1);
    setAncho(px <= ANCHO_MOVIL ? ANCHO_MOVIL : ANCHO_ESCRITORIO);
  }, []);

  const slides = useMemo(
    () => imgs.map((m, i) => ({
      src: cloudinaryLoader({ src: m.url, width: ancho }),
      alt: m.alt_text || `Foto ${i + 1}`,
    })),
    [imgs, ancho]
  );

  if (!banner) return null;

  const openAt = (i: number) => { setIdx(i); setOpen(true); };

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

      {/* ── Visor a pantalla completa ── */}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={idx}
        on={{ view: ({ index }) => setIdx(index) }}
        slides={slides}
        plugins={[Zoom, Counter, Thumbnails]}
        // preload: 2 → mantiene montadas (2·2+1) = 5 fotos. Es lo que elimina la
        // espera al deslizar: la siguiente ya está descargada.
        carousel={{ preload: 2, finite: false, imageFit: 'contain' }}
        // Un dedo navega, dos dedos amplían. Los botones de lupa +/− los añade el
        // plugin a la barra superior, así que también hay zoom sin gestos.
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          doubleClickMaxStops: 2,
          scrollToZoom: true, // rueda del ratón y trackpad en escritorio
        }}
        counter={{ container: { style: { top: 'unset', bottom: 'unset' } } }}
        thumbnails={{
          position: 'bottom', width: 80, height: 56, borderRadius: 6,
          border: 2, borderColor: '#E8B92F', gap: 8, padding: 0,
          imageFit: 'cover', vignette: false,
        }}
        controller={{ closeOnBackdropClick: true }}
        labels={{ Next: 'Siguiente', Previous: 'Anterior', Close: 'Cerrar', 'Zoom in': 'Acercar', 'Zoom out': 'Alejar' }}
        styles={{ container: { backgroundColor: 'rgba(0,0,0,0.94)' } }}
        animation={{ fade: 250, swipe: 300 }}
      />
    </>
  );
}
