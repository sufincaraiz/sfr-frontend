'use client';

import { useEffect, useRef } from 'react';

const STATS = [
  { icon: '🏡', value: 150, suffix: '+', label: 'Familias que encontraron su finca' },
  { icon: '📍', value: 8,   suffix: '',  label: 'Municipios del Gualivá' },
  { icon: '⭐', value: 98,  suffix: '%', label: 'Clientes que nos recomiendan' },
  { icon: '🏆', value: 10,  suffix: '',  label: 'Años en el territorio' },
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
                <span data-counter={i}>0</span>
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
