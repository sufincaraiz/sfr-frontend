'use client';

import { useEffect, useRef } from 'react';
import { DATOS_OFICIALES } from '@/lib/datos-oficiales';

// Las cifras vienen de la fuente única (doctrina AEO §2). Antes estaban escritas
// a mano aquí, que es exactamente lo que la doctrina prohíbe.
//
// El municipio pasa de 8 a 12: la cobertura declarada es la Provincia del
// Gualivá completa, no los municipios con inventario del día.
// El «98 % de clientes que nos recomiendan» se sustituyó por la calificación
// real de Google Business Profile: dato de tercero, verificable por cualquiera
// y con metodología pública. Va con su fuente citada, nunca el número solo.
//
// La calificación NO se marca como aggregateRating en JSON-LD: las directrices
// de Google prohíben el marcado de reseñas autorreferenciales y arriesga la
// elegibilidad de resultados enriquecidos de todo el dominio. Texto visible sí,
// schema no.
const STATS = [
  { icon: '📍', value: DATOS_OFICIALES.municipiosProvincia, suffix: '', label: 'Municipios del Gualivá' },
  { icon: '🏆', value: DATOS_OFICIALES.aniosOperacion,      suffix: '', label: `Años en el territorio (desde ${DATOS_OFICIALES.anioFundacion})` },
];

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let ctx: { revert: () => void } | null = null;

    const init = async () => {
      const { gsap }          = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // Fade-in de toda la franja
        gsap.from(section, {
          opacity: 0,
          y: 30,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 85%', once: true },
        });

        // Contadores animados
        STATS.forEach((stat, i) => {
          const el = section.querySelector<HTMLElement>(`[data-counter="${i}"]`);
          if (!el) return;

          const obj = { val: 0 };
          gsap.to(obj, {
            val: stat.value,
            duration: 2,
            ease: 'power2.out',
            delay: i * 0.12,
            scrollTrigger: { trigger: section, start: 'top 80%', once: true },
            onUpdate() {
              el.textContent = Math.round(obj.val).toString();
            },
          });
        });

        // Cards entran escalonadas
        gsap.from('[data-stat-card]', {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: section, start: 'top 85%', once: true },
        });
      }, section);
    };

    void init();
    return () => ctx?.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Estadísticas Su Finca Raíz"
      style={{ background: '#0D2D5E' }}
      className="py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Calificación de Google: NO es un contador animado ni lleva schema.
              Se escribe entera en el servidor, con la fuente citada al lado. */}
          <div data-stat-card className="flex flex-col items-center text-center gap-2">
            <span className="text-3xl mb-1" aria-hidden="true">⭐</span>
            <div
              className="font-sans font-bold"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: '#E8B92F', lineHeight: 1 }}
            >
              {DATOS_OFICIALES.googleRating.toFixed(1).replace('.', ',')}
            </div>
            <p className="font-sans font-semibold text-sm text-white/80 text-center" style={{ maxWidth: 150 }}>
              {DATOS_OFICIALES.googleRatingTexto}
            </p>
          </div>

          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              data-stat-card
              className="flex flex-col items-center text-center gap-2"
            >
              <span className="text-3xl mb-1" aria-hidden="true">{stat.icon}</span>
              <div
                className="font-sans font-bold"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: '#E8B92F', lineHeight: 1 }}
              >
                {/* El valor REAL se renderiza en el servidor. Antes había un "0"
                    incrustado y la cifra solo aparecía tras la animación en el
                    navegador: un rastreador leía "0 Años en el territorio".
                    La animación es solo un efecto sobre un nodo que ya trae el
                    texto correcto; sin JavaScript, la cifra sigue ahí. */}
                <span data-counter={i}>{stat.value}</span>
                <span>{stat.suffix}</span>
              </div>
              <p
                className="font-sans font-semibold text-sm text-white/80 text-center"
                style={{ maxWidth: 120 }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
