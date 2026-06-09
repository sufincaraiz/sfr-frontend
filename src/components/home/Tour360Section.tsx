'use client';

import { useEffect, useRef, useState } from 'react';


export function Tour360Section() {
  const sectionRef  = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy load del iframe — solo cuando el usuario llega a la sección
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Reenviar eventos de giroscopio al iframe (móvil VR)
  useEffect(() => {
    if (!isVisible) return;
    const handleMotion = (e: DeviceMotionEvent) => {
      const iframe = document.getElementById('tour-embeded') as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        {
          type: 'devicemotion',
          deviceMotionEvent: {
            acceleration: {
              x: e.acceleration?.x,
              y: e.acceleration?.y,
              z: e.acceleration?.z,
            },
            accelerationIncludingGravity: {
              x: e.accelerationIncludingGravity?.x,
              y: e.accelerationIncludingGravity?.y,
              z: e.accelerationIncludingGravity?.z,
            },
            rotationRate: {
              alpha: e.rotationRate?.alpha,
              beta:  e.rotationRate?.beta,
              gamma: e.rotationRate?.gamma,
            },
            interval:  e.interval,
            timeStamp: e.timeStamp,
          },
        },
        '*'
      );
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      id="tour-360"
      aria-label="Tour Virtual 360° de propiedades en La Vega"
      style={{
        background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
        padding: '5rem 0',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 2rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#E8B92F',
            display: 'block',
            marginBottom: '0.75rem',
          }}>
            TECNOLOGÍA INMERSIVA
          </span>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 900,
            color: '#fff',
            margin: '0 0 1rem',
            lineHeight: 1.15,
          }}>
            Explora sin salir de casa{' '}
            <span style={{ color: '#E8B92F' }}>Tour 360°</span>
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: '1rem',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Recorre cada rincón de nuestras propiedades con fotografía inmersiva de alta
            resolución. Compatible con móvil, tablet y lentes VR.
          </p>
        </div>

        {/* Visor 360° */}
        <div style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          border: '2px solid rgba(232,185,47,0.3)',
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            background: 'rgba(232,185,47,0.95)',
            color: '#0D2D5E',
            padding: '6px 14px',
            borderRadius: 20,
            fontWeight: 700,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backdropFilter: 'blur(4px)',
          }}>
            ⟳ Tour 360° · Finca Macondo
          </div>

          {/* Loader — se muestra hasta que IntersectionObserver dispara */}
          {!isVisible && (
            <div style={{
              height: 500,
              background: '#0A2347',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}>
              <div style={{
                width: 60,
                height: 60,
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: '#E8B92F',
                borderRadius: '50%',
                animation: 'sfr-spin 0.8s linear infinite',
              }} />
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                Cargando experiencia inmersiva...
              </p>
            </div>
          )}

          {/* iframe Panoee — lazy: solo se monta cuando isVisible=true */}
          {isVisible && (
            <iframe
              id="tour-embeded"
              name="FINCA MACONDO"
              src="https://tour.panoee.net/iframe/macondo"
              frameBorder={0}
              width="100%"
              height="500px"
              scrolling="no"
              allow="vr; xr; accelerometer; gyroscope; autoplay"
              allowFullScreen
              loading="eager"
              style={{ display: 'block' }}
              title="Tour Virtual 360° — Finca Macondo · Su Finca Raíz La Vega, Cundinamarca"
            />
          )}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href="/propiedades?tour360=true"
            style={{
              display: 'inline-block',
              background: '#E8B92F',
              color: '#0D2D5E',
              padding: '14px 36px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
            }}
          >
            Explorar más propiedades en 360° →
          </a>
        </div>
      </div>

      {/* keyframe local — solo afecta el spinner de esta sección */}
      <style>{`@keyframes sfr-spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}
