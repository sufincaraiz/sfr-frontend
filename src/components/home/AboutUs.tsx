'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DATOS_OFICIALES } from '@/lib/datos-oficiales';

const FACTS = [
  // Se retiró «Más de 150 propiedades vendidas»: no hay fuente que lo sustente
  // y la base solo registra el catálogo digital desde junio de 2026, así que
  // tampoco es derivable. Pendiente de un dato con respaldo.
  `Operando en el Gualivá desde ${DATOS_OFICIALES.anioFundacion}`,
  `${DATOS_OFICIALES.municipiosProvincia} municipios de cobertura en el Gualivá`,
  'Tours virtuales 360° en propiedades seleccionadas',
  'Acompañamiento legal completo en cada transacción',
  'Fotografía aérea con drones profesionales',
  // Sustituye al «98 % de clientes satisfechos», que no tenía encuesta detrás.
  `Calificación de ${DATOS_OFICIALES.googleRatingTexto}`,
];

export function AboutUs() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;

    const init = async () => {
      const { gsap }          = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const defaults = { ease: 'power3.out', duration: 0.8 };
        const trigger  = { trigger: sectionRef.current, start: 'top 80%', once: true };

        gsap.from('[data-about-eyebrow]', { ...defaults, opacity: 0, y: 18, scrollTrigger: trigger });
        gsap.from('[data-about-heading]', { ...defaults, opacity: 0, y: 28, delay: 0.1, scrollTrigger: trigger });
        gsap.from('[data-about-text] p',  { ...defaults, opacity: 0, y: 22, stagger: 0.12, delay: 0.2, scrollTrigger: trigger });
        gsap.from('[data-about-fact]',    { ...defaults, opacity: 0, x: -16, stagger: 0.09, delay: 0.35, scrollTrigger: trigger });
        gsap.from('[data-about-img]',     { ...defaults, opacity: 0, x: 36, delay: 0.15, scrollTrigger: trigger });
      }, sectionRef);
    };

    void init();
    return () => ctx?.revert();
  }, []);

  // Reenviar eventos de giroscopio al tour 360° (móvil VR)
  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      const iframe = document.getElementById('tour-embeded-about') as HTMLIFrameElement | null;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        {
          type: 'devicemotion',
          deviceMotionEvent: {
            acceleration: { x: e.acceleration?.x, y: e.acceleration?.y, z: e.acceleration?.z },
            accelerationIncludingGravity: {
              x: e.accelerationIncludingGravity?.x,
              y: e.accelerationIncludingGravity?.y,
              z: e.accelerationIncludingGravity?.z,
            },
            rotationRate: { alpha: e.rotationRate?.alpha, beta: e.rotationRate?.beta, gamma: e.rotationRate?.gamma },
            interval: e.interval,
            timeStamp: e.timeStamp,
          },
        },
        '*'
      );
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  return (
    <section
      id="nosotros"
      ref={sectionRef}
      aria-label="Acerca de Su Finca Raíz"
      className="sfr-about-section"
    >
      <div className="sfr-container">
        <span data-about-eyebrow className="sfr-eyebrow">QUIÉNES SOMOS</span>

        <h2 data-about-heading className="sfr-section-heading">
          La agencia inmobiliaria líder<br />
          en La Vega, Cundinamarca
        </h2>

        <div className="sfr-about-grid">
          {/* Columna de texto */}
          <div data-about-text className="sfr-about-text">
            <p>
              <strong>Su Finca Raíz es un centro de negocios inmobiliarios impulsado por
              inteligencia artificial en La Vega y el Gualivá</strong>: combinamos el conocimiento de un equipo nacido y criado en el
              territorio con la potencia de la Inteligencia Artificial, encabezada por{' '}
              <strong>Mac</strong>, nuestro asistente disponible 24/7.
            </p>
            <p>
              Ofrecemos un manejo integral de cada negocio — promoción, comercialización y
              consultoría jurídica de fincas, lotes, casas campestres y condominios — con
              riguroso blindaje legal para proteger tu inversión y el respaldo de la{' '}
              <strong>Constructora Conarc</strong>. Tu inmueble te espera, hazlo realidad.
            </p>

            <ul className="sfr-about-facts">
              {FACTS.map((fact) => (
                <li key={fact} data-about-fact className="sfr-about-fact-item">
                  <span className="sfr-about-check" aria-hidden="true">✓</span>
                  {fact}
                </li>
              ))}
            </ul>

            <Link
              href="/nosotros"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: '1.75rem',
                background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.92rem',
                padding: '12px 24px', borderRadius: 12, textDecoration: 'none',
              }}
            >
              Conoce más sobre nosotros <ArrowRight size={17} />
            </Link>
          </div>

          {/* Columna de tour 360° */}
          <div data-about-img className="sfr-about-image-wrap">
            <iframe
              id="tour-embeded-about"
              name="La Vega Cundinamarca"
              src="https://tour.panoee.net/iframe/lavegac"
              title="Tour Virtual 360° — La Vega, Cundinamarca · Su Finca Raíz"
              scrolling="no"
              allow="xr-spatial-tracking; accelerometer; gyroscope; autoplay"
              allowFullScreen
              loading="lazy"
              style={{
                width: '100%', height: 420, border: 'none', borderRadius: 16,
                display: 'block', boxShadow: '0 20px 60px rgba(13,45,94,0.15)',
              }}
            />
            {/* Badge superpuesto */}
            <div className="sfr-about-badge" aria-hidden="true">
              <strong>+8</strong>
              <span>años en La Vega</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
