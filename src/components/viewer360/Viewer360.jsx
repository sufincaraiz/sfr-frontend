'use client';
/**
 * ============================================================
 * VISOR 360° - Su Finca Raíz
 * Componente Next.js con Pannellum
 * GSAP + ScrollTrigger para animaciones
 * ============================================================
 */
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

export default function Viewer360({ panoramas = [], propertyTitle = '' }) {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pannellumReady, setPannellumReady] = useState(false);
  const viewerInstance = useRef(null);

  // Construir configuración de escenas para Pannellum
  const buildPannellumConfig = (panoramasList) => {
    if (!panoramasList.length) return null;

    const scenes = {};
    panoramasList.forEach((pano, idx) => {
      scenes[pano.id || `scene-${idx}`] = {
        title: pano.title,
        type: 'equirectangular',
        panorama: pano.image_url,
        hotSpots: (pano.hotspots || []).map(hs => ({
          pitch: hs.pitch,
          yaw: hs.yaw,
          type: hs.type || 'scene',
          text: hs.text,
          sceneId: hs.scene_id,
          cssClass: 'sfr-hotspot',
        })),
        ...pano.initial_view,
      };
    });

    const firstId = panoramasList[0].id || 'scene-0';
    return {
      default: {
        firstScene: firstId,
        sceneFadeDuration: 1000,
        autoLoad: true,
        compass: false,
        showControls: true,
        keyboardZoom: false,
        mouseZoom: true,
        draggable: true,
        hfov: 110,
        minHfov: 50,
        maxHfov: 120,
      },
      scenes,
    };
  };

  // Inicializar Pannellum cuando el script esté listo
  const initViewer = () => {
    if (!viewerRef.current || !panoramas.length || !window.pannellum) return;

    const config = buildPannellumConfig(panoramas);
    if (!config) return;

    // Destruir instancia previa si existe
    if (viewerInstance.current) {
      viewerInstance.current.destroy();
    }

    viewerInstance.current = window.pannellum.viewer(viewerRef.current, config);

    viewerInstance.current.on('load', () => {
      setIsLoading(false);
    });

    viewerInstance.current.on('scenechange', (sceneId) => {
      const idx = panoramas.findIndex(p => (p.id || `scene-${panoramas.indexOf(p)}`) === sceneId);
      if (idx !== -1) setCurrentScene(idx);
    });
  };

  useEffect(() => {
    if (pannellumReady) initViewer();
    return () => {
      if (viewerInstance.current) viewerInstance.current.destroy();
    };
  }, [pannellumReady, panoramas]);

  // Cambiar escena desde miniaturas
  const goToScene = (idx) => {
    if (!viewerInstance.current) return;
    const sceneId = panoramas[idx].id || `scene-${idx}`;
    viewerInstance.current.loadScene(sceneId);
  };

  if (!panoramas.length) {
    return (
      <div className="sfr-viewer-empty">
        <span>Sin tour 360° disponible</span>
      </div>
    );
  }

  return (
    <>
      {/* Scripts de Pannellum desde CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"
        strategy="afterInteractive"
        onLoad={() => setPannellumReady(true)}
      />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"
      />

      <section ref={containerRef} className="sfr-viewer-wrapper" aria-label={`Tour 360° - ${propertyTitle}`}>
        {/* Badge */}
        <div className="sfr-360-badge">
          <span className="sfr-360-icon">⟳</span>
          <span>Tour 360°</span>
        </div>

        {/* Contenedor del visor */}
        <div className="sfr-viewer-container">
          {isLoading && (
            <div className="sfr-viewer-loader">
              <div className="sfr-loader-ring" />
              <p>Cargando experiencia inmersiva...</p>
            </div>
          )}
          <div
            ref={viewerRef}
            id="panorama-viewer"
            className="sfr-pannellum-viewer"
            style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}
          />
        </div>

        {/* Selector de escenas (si hay múltiples) */}
        {panoramas.length > 1 && (
          <div className="sfr-scene-thumbnails" role="tablist" aria-label="Seleccionar escena">
            {panoramas.map((pano, idx) => (
              <button
                key={pano.id || idx}
                className={`sfr-thumb-btn ${idx === currentScene ? 'active' : ''}`}
                onClick={() => goToScene(idx)}
                role="tab"
                aria-selected={idx === currentScene}
                aria-label={`Ver: ${pano.title}`}
              >
                {pano.thumbnail_url ? (
                  <img src={pano.thumbnail_url} alt={pano.title} loading="lazy" />
                ) : (
                  <span className="sfr-thumb-placeholder">
                    {pano.title?.charAt(0) || (idx + 1)}
                  </span>
                )}
                <span className="sfr-thumb-label">{pano.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Instrucciones */}
        <p className="sfr-viewer-hint">
          🖱️ Arrastra para explorar · Scroll para zoom · Toca los puntos para navegar
        </p>
      </section>

      <style jsx>{`
        .sfr-viewer-wrapper {
          position: relative;
          background: #0D2D5E;
          border-radius: 16px;
          overflow: hidden;
          margin: 2rem 0;
        }
        .sfr-360-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 10;
          background: rgba(232, 185, 47, 0.95);
          color: #0D2D5E;
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 6px;
          backdrop-filter: blur(4px);
        }
        .sfr-360-icon { font-size: 1rem; }
        .sfr-viewer-container {
          position: relative;
          width: 100%;
          height: 500px;
        }
        .sfr-pannellum-viewer {
          width: 100%;
          height: 100%;
          border-radius: 16px 16px 0 0;
        }
        .sfr-viewer-loader {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0D2D5E;
          z-index: 5;
          gap: 1rem;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
        }
        .sfr-loader-ring {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(255,255,255,0.2);
          border-top-color: #E8B92F;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sfr-scene-thumbnails {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #E8B92F #0D2D5E;
          background: rgba(13, 45, 94, 0.95);
        }
        .sfr-thumb-btn {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 4px;
          background: transparent;
          transition: border-color 0.2s, transform 0.2s;
        }
        .sfr-thumb-btn:hover, .sfr-thumb-btn.active {
          border-color: #E8B92F;
          transform: translateY(-2px);
        }
        .sfr-thumb-btn img {
          width: 72px;
          height: 48px;
          object-fit: cover;
          border-radius: 4px;
        }
        .sfr-thumb-placeholder {
          width: 72px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1B56A1;
          border-radius: 4px;
          color: #fff;
          font-weight: 700;
        }
        .sfr-thumb-label {
          color: #fff;
          font-size: 0.65rem;
          max-width: 72px;
          text-align: center;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .sfr-viewer-hint {
          text-align: center;
          color: rgba(255,255,255,0.5);
          font-size: 0.75rem;
          padding: 8px;
          background: rgba(13, 45, 94, 0.95);
        }
        .sfr-viewer-empty {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f4f8;
          border-radius: 12px;
          color: #666;
        }
        /* Hotspot personalizado */
        :global(.sfr-hotspot) {
          background: rgba(232, 185, 47, 0.9);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          border: 2px solid #fff;
        }
        @media (max-width: 768px) {
          .sfr-viewer-container { height: 280px; }
        }
      `}</style>
    </>
  );
}
