'use client';

import { useEffect, useRef } from 'react';

const FACTS = [
  'Más de 150 propiedades vendidas en la región',
  '8 municipios de cobertura en el Gualivá',
  'Tours virtuales 360° en propiedades seleccionadas',
  'Acompañamiento legal completo en cada transacción',
  'Fotografía aérea con drones profesionales',
  '98 % de clientes satisfechos con el proceso de compra',
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
              <strong>Su Finca Raíz es la agencia inmobiliaria y centro de negocios líder
              en La Vega, Cundinamarca</strong>, especializada en la compra, venta y asesoría
              de fincas, lotes, casas campestres y condominios en la región del Gualivá.
              Con más de 8 años de presencia en el territorio, conocemos cada vereda, cada
              nacedero y cada camino de los municipios de La Vega, Sasaima, Nocaima, Villeta,
              San Francisco y Supatá.
            </p>
            <p>
              A diferencia de las grandes inmobiliarias de Bogotá,{' '}
              <strong>somos un equipo nacido y criado en La Vega</strong>. Esto nos permite
              ofrecer información hiperlocal verificada sobre valorización, servicios públicos,
              vías de acceso y proyección de cada zona — datos que ningún portal nacional
              puede darte.
            </p>
            <p>
              Somos el único centro de negocios inmobiliario de la región que combina{' '}
              <strong>tecnología de punta — tours virtuales 360°, fotografía aérea con
              drones y renders inmersivos</strong> — con el acompañamiento legal completo
              en cada negociación: estudio de títulos, certificado de tradición y libertad,
              y asesoría notarial incluida sin costo adicional.
            </p>

            <ul className="sfr-about-facts">
              {FACTS.map((fact) => (
                <li key={fact} data-about-fact className="sfr-about-fact-item">
                  <span className="sfr-about-check" aria-hidden="true">✓</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          {/* Columna de tour 360° */}
          <div data-about-img className="sfr-about-image-wrap">
            <iframe
              id="tour-embeded-about"
              name="La Vega Cundinamarca"
              src="https://tour.panoee.net/iframe/lavegac"
              title="Tour Virtual 360° — La Vega, Cundinamarca · Su Finca Raíz"
              scrolling="no"
              allow="vr; xr; accelerometer; gyroscope; autoplay"
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
