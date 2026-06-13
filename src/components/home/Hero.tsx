'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { SearchBar } from '@/components/search/SearchBar';

const HERO_IMAGE = '/images/la-vega/la-vega-cundinamarca-home.jpg';

export function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);

  // Parallax pasivo — sin GSAP, sin bloqueo del hilo principal
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      if (bgRef.current && scrolled < window.innerHeight) {
        bgRef.current.style.transform = `translateY(${scrolled * 0.25}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToFeatured = () => {
    document.getElementById('featured-properties')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero-section"
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      aria-label="Sección principal"
    >
      {/* Fondo: imagen con parallax pasivo */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          ref={bgRef}
          className="absolute w-full h-[133%] -top-[16%]"
          style={{
            backgroundImage: `url("${HERO_IMAGE}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            willChange: 'transform',
          }}
          aria-hidden="true"
        />
        {/* Overlay estático — CSS fade-in, sin GSAP */}
        <div
          className="absolute inset-0 hero-overlay-anim"
          style={{ background: 'rgba(13,45,94,0.75)' }}
          aria-hidden="true"
        />
      </div>

      {/* Contenido — animaciones CSS puras, GPU-composited */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 sm:px-6 pt-28 pb-12 max-w-5xl mx-auto">

        {/* Eyebrow decorativo — delay 0s */}
        <p
          className="hero-anim font-sans font-semibold text-sm tracking-[0.28em] uppercase mb-2"
          style={{ color: '#E8B92F', animationDelay: '0s' }}
        >
          La Vega · Sasaima · Nocaima · Villeta
        </p>

        {/* H1 — keyword SEO, estilo eyebrow sutil — delay 0.15s */}
        <h1
          className="hero-anim"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.70)',
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            marginBottom: '1.25rem',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            animationDelay: '0.15s',
          }}
        >
          Fincas, Lotes y Casas Campestres en Venta · La Vega, Cundinamarca
        </h1>

        {/* H2 — titular emocional grande — delay 0.3s */}
        <h2
          className="hero-anim font-sans text-white text-balance mb-5"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            animationDelay: '0.3s',
          }}
        >
          Tu inmueble te espera,<br />
          ¡Hazlo{' '}
          <span style={{ color: '#E8B92F' }}>Realidad</span>!
        </h2>

        {/* Descripción — delay 0.5s */}
        <p
          className="hero-anim font-sans text-white/80 max-w-2xl mb-8 leading-relaxed"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            fontWeight: 400,
            textShadow: '0 1px 6px rgba(0,0,0,0.4)',
            animationDelay: '0.5s',
          }}
        >
          Encuentra tu refugio ideal a menos de dos horas de Bogotá. Descubre condominios
          exclusivos, proyectos inmobiliarios y cabañas con alta proyección de valorización.
        </p>

        {/* Botón "Ver proyectos destacados" — delay 0.65s */}
        <button
          onClick={scrollToFeatured}
          className="hero-anim mb-8 inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold transition-colors hover:bg-yellow-400/10 active:scale-[0.97]"
          style={{
            border: '2px solid #E8B92F',
            color: '#E8B92F',
            background: 'transparent',
            animationDelay: '0.65s',
          }}
        >
          Ver proyectos destacados →
        </button>

        {/* CTAs principales — delay 0.8s */}
        <div
          className="hero-anim flex flex-col sm:flex-row items-center gap-3 mb-12 w-full max-w-xs sm:max-w-none sm:justify-center"
          style={{ animationDelay: '0.8s' }}
        >
          <Link
            href="/propiedades?tipo=finca"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm transition-all active:scale-[0.97]"
            style={{ background: '#E8B92F', color: '#0D2D5E', fontWeight: 700 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d4a728')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#E8B92F')}
          >
            Ver propiedades
          </Link>
          <Link
            href="/vender-mi-finca"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ border: '2px solid #FFFFFF', color: '#FFFFFF', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Vende tu finca
          </Link>
        </div>

        {/* Buscador — delay 0.95s */}
        <div
          className="hero-anim w-full max-w-3xl"
          style={{ animationDelay: '0.95s' }}
        >
          <SearchBar />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 opacity-60">
        <span className="text-white text-[10px] font-bold tracking-[0.25em] uppercase">Explorar</span>
        <div className="w-px h-10 bg-white/50" aria-hidden="true" />
      </div>
    </section>
  );
}
