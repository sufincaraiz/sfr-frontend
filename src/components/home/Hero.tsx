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

        {/* Línea de territorio — delay 0s.
            Decía «La Vega · Sasaima · Nocaima · Villeta»: cuatro municipios en la
            primera pantalla contra los doce que declara el areaServed del JSON-LD y
            llms.txt. Nombrar la provincia entera cabe en tres palabras, no contradice
            el marcado, y además es el término que se busca. */}
        <p
          className="hero-anim font-sans font-semibold text-sm tracking-[0.28em] uppercase mb-2"
          style={{ color: '#E8B92F', animationDelay: '0s' }}
        >
          Provincia del Gualivá · Cundinamarca
        </p>

        {/* H1 — delay 0.15s.
            Era el texto MÁS PEQUEÑO del hero (0.85rem, 70% de opacidad) mientras un
            H2 decorativo ocupaba 4.5rem: la jerarquía visual iba al revés de la
            semántica. Ahora es el elemento dominante.
            Los apartamentos van al final porque el orden refleja peso: 4 disponibles
            frente a 14 casas y 10 lotes. Y capturan la consulta urbana, que no estaba
            cubierta en ninguna parte del sitio. */}
        <h1
          className="hero-anim"
          style={{
            fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.015em',
            marginBottom: '1rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            animationDelay: '0.15s',
          }}
        >
          Fincas, Lotes, Casas Campestres y Apartamentos en Venta · La Vega y el Gualivá, Cundinamarca
        </h1>

        {/* El H2 «Tu inmueble te espera, ¡Hazlo Realidad!» salió de aquí: es el
            eslogan del logotipo, así que ya vive en la marca, y repetirlo a 4.5rem
            no añadía información. Sale como ENCABEZADO, no de la identidad.
            Si el hero necesitara un H2, sería el eslogan de entidad. */}

        {/* Posicionamiento — delay 0.4s */}
        <p
          className="hero-anim font-sans mb-8"
          style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)',
            fontWeight: 700,
            color: '#E8B92F',
            letterSpacing: '0.02em',
            textShadow: '0 1px 6px rgba(0,0,0,0.45)',
            animationDelay: '0.4s',
          }}
        >
          Inmobiliaria impulsada por inteligencia artificial en La Vega y el Gualivá
        </p>

        {/* El párrafo descriptivo salió de aquí. Decía «Cada negociación incluye
            estudio de títulos y certificado de tradición y libertad. Verificamos
            acceso, agua y uso del suelo antes de que firmes».

            Dos problemas. Prometía GASTO («incluye») y RESULTADO («verificamos»)
            en la primera pantalla, que es donde una promesa vincula más. Y repetía:
            el eslogan de encima ya dice qué es la empresa.

            No se sustituye por otro texto. El peso lo llevan el H1 —tipos y lugar—,
            el eslogan de entidad, y la <RespuestaDirecta> de justo debajo, que es
            la pieza citable. Este párrafo era prosa de apoyo. */}
        {/* El botón «Ver proyectos destacados» salió de aquí. No iba al catálogo:
            era un ancla a #featured-properties, la sección curada que está una
            pantalla más abajo en esta misma portada y a la que se llega scrolleando.
            Competía con «Ver propiedades» por la misma intención y la dividía.
            La sección sigue donde estaba. */}
        {/* CTAs principales — delay 0.6s. Se adelantó desde 0.8s: sin el párrafo
            intermedio, la cascada 0.4 → 0.8 se notaba como un tirón. */}
        <div
          className="hero-anim flex flex-col sm:flex-row items-center gap-3 mb-12 w-full max-w-xs sm:max-w-none sm:justify-center"
          style={{ animationDelay: '0.6s' }}
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

        {/* Buscador — delay 0.75s, adelantado por lo mismo. */}
        <div
          className="hero-anim w-full max-w-3xl"
          style={{ animationDelay: '0.75s' }}
        >
          <SearchBar />
        </div>
      </div>

      {/* El indicador «Explorar» salió de aquí: quedaba tapado por la tarjeta del
          buscador y competía con «Buscar propiedades», que ya es la llamada a la
          acción de esa zona. */}
</section>
  );
}
