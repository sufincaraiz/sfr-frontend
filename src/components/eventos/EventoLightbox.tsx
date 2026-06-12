'use client';

import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';

// Dimensiones reales de cada flyer (para que el plugin zoom calcule bien la
// resolución nativa desde el inicio). Se sirven en WebP a resolución completa
// para que la letra pequeña de la programación sea legible al hacer zoom.
const FLYERS: { src: string; width: number; height: number }[] = [
  { src: '/eventos/la-vega-421-anos-1.webp', width: 1448, height: 1086 },
  { src: '/eventos/la-vega-421-anos-2.webp', width: 2048, height: 857 },
  { src: '/eventos/la-vega-421-anos-3.webp', width: 1465, height: 2048 },
  { src: '/eventos/la-vega-421-anos-4.webp', width: 1465, height: 2048 },
  { src: '/eventos/la-vega-421-anos-5.webp', width: 1465, height: 2048 },
  { src: '/eventos/la-vega-421-anos-6.webp', width: 1465, height: 2048 },
];

export default function EventoLightbox({ onClose }: { onClose: () => void }) {
  return (
    <Lightbox
      open
      close={onClose}
      slides={FLYERS}
      plugins={[Zoom, Counter]}
      // Pinch (móvil), scroll y doble-clic (desktop) para agrandar y leer horarios
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        scrollToZoom: true,
        doubleTapDelay: 300,
      }}
      counter={{ container: { style: { top: 'unset', bottom: 0 } } }}
      carousel={{ finite: true, imageFit: 'contain' }}
      // Cerrar al hacer clic fuera (Esc lo maneja YARL por defecto)
      controller={{ closeOnBackdropClick: true }}
      // Accesibilidad: etiquetas en español para cerrar y navegar
      labels={{ Next: 'Siguiente', Previous: 'Anterior', Close: 'Cerrar' }}
      styles={{ container: { backgroundColor: 'rgba(13,45,94,0.92)' } }}
      animation={{ fade: 250, swipe: 300 }}
    />
  );
}
