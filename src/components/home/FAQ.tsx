'use client';

import { useEffect, useRef } from 'react';

import { HOME_FAQS as FAQS } from '@/lib/faq-data'

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let ctx: { revert: () => void } | null = null;

    const init = async () => {
      const { gsap }          = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const trigger = { trigger: sectionRef.current, start: 'top 82%', once: true };
        gsap.from('[data-faq-header]', { opacity: 0, y: 24, duration: 0.7, ease: 'power3.out', scrollTrigger: trigger });
        gsap.from('[data-faq-item]',   { opacity: 0, y: 20, duration: 0.65, ease: 'power3.out', stagger: 0.11, delay: 0.15, scrollTrigger: trigger });
        gsap.from('[data-faq-cta]',    { opacity: 0, y: 16, duration: 0.6,  ease: 'power3.out', delay: 0.6, scrollTrigger: trigger });
      }, sectionRef);
    };

    void init();
    return () => ctx?.revert();
  }, []);

  return (
    <section
      id="preguntas-frecuentes"
      ref={sectionRef}
      aria-label="Preguntas Frecuentes sobre Su Finca Raíz"
      className="sfr-faq-section"
    >
      <div className="sfr-container">
        <div data-faq-header className="sfr-faq-header">
          <span className="sfr-eyebrow">PREGUNTAS FRECUENTES</span>
          <h2 className="sfr-section-heading">
            Todo lo que necesitas saber<br />
            antes de invertir en el Gualivá
          </h2>
        </div>

        <div className="sfr-faq-list" role="list">
          {FAQS.map((faq, i) => (
            <details key={i} data-faq-item className="sfr-faq-item" role="listitem">
              <summary className="sfr-faq-summary">
                <span className="sfr-faq-question-text">{faq.question}</span>
                <span className="sfr-faq-icon" aria-hidden="true" />
              </summary>
              <div className="sfr-faq-answer">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        <p data-faq-cta className="sfr-faq-cta">
          ¿Tienes otra pregunta?{' '}
          <a
            href="https://wa.me/573218826730?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20una%20propiedad"
            target="_blank"
            rel="noopener noreferrer"
            className="sfr-faq-cta-link"
          >
            Escríbenos por WhatsApp →
          </a>
        </p>
      </div>
    </section>
  );
}
