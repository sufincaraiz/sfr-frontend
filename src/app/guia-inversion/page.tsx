import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Home, ChevronRight, Sun, Route, TrendingUp,
  LandPlot, Trees, Building2, MapPinned, Video, Scale, Bot,
} from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { AsesorForm } from './AsesorForm';

const PUBLISHED = '2026-06-13';
const COVER = '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Guía de Inversión Inmobiliaria en La Vega y el Gualivá | Su Finca Raíz',
  description:
    'Guía definitiva para invertir en lotes, fincas, quintas y apartamentos en La Vega, ' +
    'Cundinamarca y el corredor del Gualivá: valorización, nichos y rentabilidad (ROI).',
  alternates: { canonical: `${SITE_URL}/guia-inversion` },
  openGraph: {
    title: 'Guía Definitiva de Inversión Inmobiliaria en La Vega, Cundinamarca',
    description:
      'Todo lo que necesitas saber antes de invertir en la región de mayor valorización ' +
      'del país: La Vega y el corredor del Gualivá.',
    url: `${SITE_URL}/guia-inversion`,
    type: 'article',
    locale: 'es_CO',
    images: [{ url: `${SITE_URL}${COVER}`, width: 1200, height: 630 }],
  },
};

// ─── FAQ (visible + FAQPage schema; rentabilidad por municipio) ───────────────

const FAQS = [
  {
    question: '¿Es rentable invertir en finca raíz en La Vega, Cundinamarca?',
    answer:
      'Sí. La Vega combina cercanía a Bogotá (menos de dos horas), un microclima templado de ~22°C y una demanda constante de alquiler vacacional de corta estancia, lo que sostiene una valorización constante de lotes, fincas de descanso y apartamentos. Es uno de los destinos de mayor proyección del país para inversión inmobiliaria.',
  },
  {
    question: '¿Qué rentabilidad ofrece invertir en San Francisco, Cundinamarca?',
    answer:
      'San Francisco ofrece climas templados y terrenos vírgenes ideales para proyectos ecológicos, con precios de entrada más competitivos que el casco de La Vega y una buena proyección al ser parte del corredor del Gualivá. Es una oportunidad atractiva para inversionistas que buscan valorización a mediano plazo.',
  },
  {
    question: '¿Conviene comprar finca o lote en Sasaima para inversión?',
    answer:
      'Sasaima cuenta con topografías fascinantes para fincas productivas y de recreo. Su integración al corredor inmobiliario impulsado por La Vega lo convierte en una zona de oportunidades de alta rentabilidad, especialmente para quienes buscan terrenos con potencial agrícola o turístico.',
  },
  {
    question: '¿Por qué invertir en Villeta, Cundinamarca?',
    answer:
      'Villeta es el destino tradicional y cálido de la región, perfecto para condominios de lujo y turismo de alto nivel. La fuerte demanda turística sostiene el interés por propiedades de descanso y alquiler vacacional, lo que respalda su atractivo como inversión.',
  },
  {
    question: '¿Qué oportunidades de inversión hay en Nocaima?',
    answer:
      'Nocaima ofrece un clima templado y terrenos aptos para proyectos ecológicos y fincas de descanso, con precios competitivos por su cercanía a La Vega. Es una de las oportunidades "ocultas" del corredor del Gualivá con buena proyección de valorización.',
  },
  {
    question: '¿Vale la pena invertir en Vergara, Cundinamarca?',
    answer:
      'Vergara presenta topografías ideales para fincas productivas y de recreo. Al formar parte del crecimiento orgánico del corredor del Gualivá, ofrece oportunidades de inversión a precios más accesibles con potencial de valorización a futuro.',
  },
  {
    question: '¿Qué documentos necesito para comprar una propiedad de forma segura?',
    answer:
      'Para una compra segura se requiere el Certificado de Tradición y Libertad reciente, las escrituras públicas, paz y salvos de impuestos y administración (si aplica), y un estudio de títulos realizado por un abogado independiente. En Su Finca Raíz validamos toda la documentación jurídica antes de ofrecer una propiedad.',
  },
];

// ─── Datos de secciones ─────────────────────────────────────────────────────────

const VALORIZACION = [
  { icon: Sun, title: 'Clima Perfecto y Topografía', text: 'Un microclima envidiable (22°C promedio) que permite disfrutar de piscinas y naturaleza los 365 días del año.' },
  { icon: Route, title: 'Desarrollo de Infraestructura', text: 'Vías de acceso en constante mejora que conectan rápidamente con la capital, convirtiendo a La Vega en la opción ideal para vivienda principal o turismo de fin de semana.' },
  { icon: TrendingUp, title: 'Alta Rentabilidad (ROI)', text: 'La demanda por alquileres vacacionales de corta estancia supera la oferta, garantizando retornos sólidos para quienes invierten en propiedades de descanso.' },
];

const CATALOGO = [
  { icon: LandPlot, title: 'Lotes y Parcelaciones Campestres', text: 'El lienzo en blanco para tu casa ideal. Nos enfocamos en terrenos urbanizados con proyección y seguridad. Proyectos estructurados con visión, como Senderos del Bosque o la Parcelación Cucharal, representan el estándar de lo que un inversionista debe buscar: vías, servicios y proyecciones arquitectónicas claras.' },
  { icon: Trees, title: 'Fincas y Quintas de Descanso', text: 'Propiedades con áreas generosas, árboles frutales y diseños que se integran con la naturaleza. Ideales para el retiro o la explotación turística.' },
  { icon: Building2, title: 'Apartamentos y Proyectos Urbanos', text: 'Para quienes buscan la practicidad del casco urbano sin perder la tranquilidad del municipio. Modernidad, seguridad y fácil mantenimiento en el corazón de La Vega.' },
];

const CORREDOR = [
  { title: 'San Francisco y Nocaima', text: 'Climas templados y terrenos vírgenes ideales para proyectos ecológicos.' },
  { title: 'Sasaima y Vergara', text: 'Topografías fascinantes para fincas productivas y de recreo.' },
  { title: 'Villeta', text: 'El destino tradicional y cálido, perfecto para condominios de lujo y turismo de alto nivel.' },
];

const AUTORIDAD = [
  { icon: Video, title: 'Visión Inmersiva', text: 'Explora propiedades desde Bogotá o el extranjero con nuestros recorridos 360° y cinematografía con drones. Conoce el entorno real antes de viajar.' },
  { icon: Scale, title: 'Blindaje Jurídico', text: 'Acompañamiento estricto en el saneamiento de títulos, estudio de tradición y promesas de compraventa.' },
  { icon: Bot, title: 'Asesoría Inteligente', text: 'Respuestas rápidas y precisas apoyadas por nuestra tecnología de vanguardia y nuestro Agente Mac.' },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  '@id': `${SITE_URL}/guia-inversion#article`,
  headline: 'Guía Definitiva de Inversión Inmobiliaria en La Vega, Cundinamarca (y el Corredor del Gualivá)',
  description:
    'Guía para invertir en lotes, fincas, quintas y apartamentos en La Vega y el corredor del Gualivá: valorización, nichos de inversión y rentabilidad.',
  url: `${SITE_URL}/guia-inversion`,
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  image: [{ '@type': 'ImageObject', url: `${SITE_URL}${COVER}`, width: 1200, height: 630 }],
  author: { '@type': 'Organization', name: 'Su Finca Raíz', url: SITE_URL },
  publisher: {
    '@type': 'Organization',
    name: 'Su Finca Raíz',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo-su-finca-raiz-blanco.png`, width: 200, height: 60 },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/guia-inversion` },
  about: 'Inversión inmobiliaria en La Vega, Cundinamarca y el corredor del Gualivá',
};

// ─── Helpers de presentación ──────────────────────────────────────────────────

function SectionTitle({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      {eyebrow && (
        <span style={{ display: 'block', color: '#A7CB61', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
          {eyebrow}
        </span>
      )}
      <h2 style={{ color: '#0D2D5E', fontWeight: 900, fontSize: 'clamp(1.4rem,3.2vw,2rem)', lineHeight: 1.25, margin: 0, position: 'relative', paddingLeft: 16, borderLeft: '4px solid #E8B92F' }}>
        {children}
      </h2>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function GuiaInversionPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Guía de Inversión', href: '/guia-inversion' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={articleSchema} />
      <JsonLd data={faqSchema(FAQS)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(3rem,8vw,5rem) 1.5rem' }}>
          <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '5px 16px', borderRadius: 20, marginBottom: 20, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Guía de Inversión
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.9rem,4.8vw,3.1rem)', lineHeight: 1.14, marginBottom: 20 }}>
              Guía Definitiva de Inversión Inmobiliaria en La Vega, Cundinamarca (y el Corredor del Gualivá)
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, fontSize: 'clamp(1rem,2.2vw,1.15rem)', maxWidth: 720, margin: '0 auto' }}>
              Comprar una propiedad no es solo adquirir tierra; es asegurar tu patrimonio y tu
              calidad de vida. A menos de dos horas de Bogotá, La Vega se ha consolidado como el
              epicentro de la inversión inmobiliaria en Cundinamarca.
            </p>
          </div>
        </section>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 880, margin: '0 auto', padding: '0.9rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Guía de Inversión</span>
        </nav>

        <article style={{ maxWidth: 880, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

          {/* Intro */}
          <p style={{ color: '#334155', fontSize: '1.1rem', lineHeight: 1.85, marginBottom: '3.5rem' }}>
            En esta guía, diseñada por los expertos de <strong style={{ color: '#0D2D5E' }}>Su Finca Raíz</strong>,
            te mostramos todo lo que necesitas saber antes de invertir en lotes, fincas de descanso,
            quintas o apartamentos en la región de mayor valorización del país.
          </p>

          {/* Sección 1 */}
          <section style={{ marginBottom: '3.5rem' }}>
            <SectionTitle eyebrow="Sección 1">¿Por qué La Vega es el Top 1 en Valorización?</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {VALORIZACION.map(({ icon: Icon, title, text }) => (
                <div key={title} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.6rem 1.4rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', marginBottom: '1rem' }}>
                    <Icon size={24} color="#1B56A1" />
                  </span>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', marginBottom: 8 }}>{title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.65 }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 2 */}
          <section style={{ marginBottom: '3.5rem' }}>
            <SectionTitle eyebrow="Sección 2">El Catálogo de Inversión</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {CATALOGO.map(({ icon: Icon, title, text }) => (
                <div key={title} style={{ display: 'flex', gap: 16, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: '#FFF7E6', flexShrink: 0 }}>
                    <Icon size={24} color="#E8B92F" />
                  </span>
                  <div>
                    <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.08rem', marginBottom: 8 }}>{title}</h3>
                    <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7 }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 3 */}
          <section style={{ marginBottom: '3.5rem' }}>
            <SectionTitle eyebrow="Sección 3">El Corredor del Gualivá</SectionTitle>
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1.75rem' }}>
              El auge de La Vega ha impulsado un crecimiento orgánico hacia los municipios vecinos,
              creando un corredor inmobiliario de alto potencial. En Su Finca Raíz te guiamos para
              encontrar oportunidades &ldquo;ocultas&rdquo; de alta rentabilidad en:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {CORREDOR.map(({ title, text }) => (
                <div key={title} style={{ background: '#0D2D5E', borderRadius: 16, padding: '1.5rem 1.4rem' }}>
                  <MapPinned size={22} color="#E8B92F" style={{ marginBottom: 10 }} />
                  <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.02rem', marginBottom: 8 }}>{title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Sección 4 */}
          <section style={{ marginBottom: '3.5rem' }}>
            <SectionTitle eyebrow="Sección 4">¿Por qué invertir con Su Finca Raíz?</SectionTitle>
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1.75rem' }}>
              No dejes tu patrimonio al azar. En nuestro Centro de Negocios transformamos la
              experiencia de compra:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {AUTORIDAD.map(({ icon: Icon, title, text }) => (
                <div key={title} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.6rem 1.4rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', marginBottom: '1rem' }}>
                    <Icon size={24} color="#1B56A1" />
                  </span>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', marginBottom: 8 }}>{title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.65 }}>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ visible (coincide con FAQPage schema) */}
          <section style={{ marginBottom: '3.5rem' }}>
            <SectionTitle eyebrow="Preguntas frecuentes">Rentabilidad en La Vega y el Gualivá</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {FAQS.map(({ question, answer }) => (
                <details key={question} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '1rem 1.25rem' }}>
                  <summary style={{ color: '#0D2D5E', fontWeight: 700, fontSize: '0.98rem', cursor: 'pointer', listStyle: 'none' }}>
                    {question}
                  </summary>
                  <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.7, marginTop: 10 }}>
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA / Formulario */}
          <section id="asesor" style={{ scrollMarginTop: '2rem' }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(13,45,94,0.07)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0D2D5E, #1B56A1)', padding: '1.75rem 1.75rem 1.5rem', textAlign: 'center' }}>
                <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '1.45rem', marginBottom: 8 }}>
                  Habla con un asesor experto
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 440, margin: '0 auto' }}>
                  Cuéntanos tu objetivo de inversión y te orientamos hacia las mejores oportunidades
                  del corredor del Gualivá. Respuesta en menos de 24 horas.
                </p>
              </div>
              <div style={{ padding: '1.75rem', maxWidth: 480, margin: '0 auto' }}>
                <AsesorForm />
              </div>
            </div>
          </section>

        </article>
      </main>
    </>
  );
}
