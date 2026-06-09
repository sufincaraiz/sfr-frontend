'use client';

import { useEffect, useRef } from 'react';

const FAQS = [
  {
    question: '¿Por qué invertir en La Vega, Cundinamarca en 2025?',
    answer:
      'La Vega y la región del Gualivá registran una valorización anual promedio del 18 %, ' +
      'impulsada por tres factores concretos: la doble calzada Bogotá-La Vega que redujo el ' +
      'tiempo de desplazamiento a menos de 90 minutos, el auge del turismo campestre ' +
      'post-pandemia, y la escasez de lotes disponibles con servicios públicos completos. ' +
      'Invertir aquí hoy equivale a lo que fue invertir en el Oriente Antioqueño hace 15 años. ' +
      'La zona combina clima templado (18 °C promedio), agua potable, luz eléctrica y ' +
      'conectividad — condiciones que la convierten en la primera opción para familias ' +
      'bogotanas que buscan segunda vivienda o retiro.',
  },
  {
    question: '¿Qué servicios ofrece Su Finca Raíz como Centro de Negocios Inmobiliarios?',
    answer:
      'Su Finca Raíz opera como el centro de negocios inmobiliarios más completo de la región ' +
      'del Gualivá. Nuestros servicios incluyen: (1) Compra y venta de fincas, lotes, casas ' +
      'campestres y condominios; (2) Tours virtuales 360° e inspección aérea con drones para ' +
      'compradores remotos; (3) Estudio de títulos y certificado de tradición y libertad ' +
      'incluido en cada negociación; (4) Asesoría notarial y acompañamiento en promesas de ' +
      'compraventa; (5) Avalúo técnico de propiedades rurales y campestres; (6) Gestión de ' +
      'proyectos de construcción campestre para inversionistas. Todo esto bajo un modelo de ' +
      'asesoría personalizada: un agente exclusivo por cliente desde la búsqueda hasta la ' +
      'escrituración.',
  },
  {
    question: '¿Cómo garantiza Su Finca Raíz la seguridad legal al comprar una propiedad?',
    answer:
      'Garantizamos seguridad jurídica en cada transacción mediante un proceso de tres capas. ' +
      'Primera capa — verificación documental: solicitamos y revisamos el certificado de ' +
      'tradición y libertad actualizado en la Superintendencia de Notariado, confirmando que ' +
      'el predio no tiene embargos, hipotecas ni litigios activos. Segunda capa — estudio de ' +
      'títulos profesional: un abogado especialista en derecho inmobiliario revisa la cadena ' +
      'de propietarios mínimo los últimos 20 años. Tercera capa — acompañamiento notarial: ' +
      'asistimos al comprador y vendedor en la notaría, revisamos la minuta de compraventa y ' +
      'verificamos el pago correcto de impuestos. Este proceso, que en otras inmobiliarias es ' +
      'un servicio adicional costoso, en Su Finca Raíz está incluido sin costo adicional.',
  },
  {
    question: '¿Cuánto cuesta una finca o lote campestre en La Vega, Cundinamarca?',
    answer:
      'Los precios en La Vega y el Gualivá varían según tipo de propiedad, ubicación y ' +
      'servicios disponibles. Como referencia actualizada para 2025: Lotes desde 500 m² con ' +
      'servicios públicos completos desde $85.000.000 COP. Casas campestres en condominio ' +
      'cerrado (80-120 m² construidos) desde $280.000.000 COP. Fincas productivas entre 1 y ' +
      '5 hectáreas con vía de acceso entre $350.000.000 y $900.000.000 COP. Condominios ' +
      'campestres con amenidades desde $320.000.000 COP. Para un avalúo personalizado o el ' +
      'listado completo de propiedades disponibles filtrado por tu presupuesto, contáctanos ' +
      'por WhatsApp al +57 321 882 6730.',
  },
];

// JSON-LD FAQPage inline — Google lo indexa para rich results
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: { '@type': 'Answer', text: f.answer },
  })),
};

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
      {/* Schema FAQPage — rich results en Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA, null, 0) }}
      />

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
