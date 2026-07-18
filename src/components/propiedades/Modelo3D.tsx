'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Move3d } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Visor de modelos 3D (glTF/GLB) con <model-viewer> de Google. El script se
// carga una sola vez desde CDN y SOLO cuando esta pieza se monta, es decir, en
// las propiedades que tienen modelo cargado — no afecta al resto del sitio.
// Pensado para mallas de fotogrametría con dron exportadas a .glb.
// ─────────────────────────────────────────────────────────────────────────────

const MV_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

export function Modelo3D({ src, alt }: { src: string; alt?: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (customElements.get('model-viewer')) { setReady(true); return; }

    const onDefined = () => customElements.whenDefined('model-viewer').then(() => setReady(true));

    const existing = document.querySelector<HTMLScriptElement>('script[data-model-viewer]');
    if (existing) { onDefined(); return; }

    const s = document.createElement('script');
    s.type = 'module';
    s.src = MV_SRC;
    s.dataset.modelViewer = 'true';
    document.head.appendChild(s);
    onDefined();
  }, []);

  // Custom element renderizado siempre; se "actualiza" cuando el script define
  // model-viewer. El overlay tapa el hueco mientras carga la librería.
  const viewer = React.createElement('model-viewer', {
    src,
    alt: alt ?? 'Modelo 3D de la propiedad',
    'camera-controls': '',
    'auto-rotate': '',
    'auto-rotate-delay': '400',
    'rotation-per-second': '18deg',
    'interaction-prompt': 'auto',
    'shadow-intensity': '0.6',
    'touch-action': 'pan-y',
    exposure: '1',
    ar: '',
    'ar-modes': 'webxr scene-viewer quick-look',
    loading: 'eager',
    style: { width: '100%', height: '100%', display: 'block', backgroundColor: '#0D2D5E', '--poster-color': 'transparent' } as React.CSSProperties,
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: 'clamp(320px, 58vw, 520px)', background: '#0D2D5E' }}>
      {viewer}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.7)',
          background: '#0D2D5E', pointerEvents: 'none',
        }}>
          <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando modelo 3D…</span>
        </div>
      )}
      {ready && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(13,45,94,0.72)', color: '#fff', fontSize: '0.72rem', fontWeight: 600,
          padding: '5px 10px', borderRadius: 20, pointerEvents: 'none', backdropFilter: 'blur(4px)',
        }}>
          <Move3d size={13} /> Arrastra para girar · pellizca para acercar
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
