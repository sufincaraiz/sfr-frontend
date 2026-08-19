import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Home, ChevronRight, Sun, Route, TrendingUp,
  LandPlot, Trees, Building2, MapPinned, Video, Scale, Bot,
} from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd';
import { AsesorForm } from './AsesorForm';
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta';
import { respuestaGuiaInversion } from '@/lib/respuestas-directas';
import { getMunicipiosConDatos } from '@/lib/cobertura';
import { DATOS_OFICIALES } from '@/lib/datos-oficiales';
import { faqsDeMunicipios } from '@/lib/faq-municipios';
import { FAQS_GENERALES } from '@/lib/faqs';

const PUBLISHED = '2026-06-13';
const COVER = '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Guía de Inversión Inmobiliaria en La Vega y el Gualivá',
  description:
    'Guía definitiva para invertir en lotes, fincas, quintas y apartamentos en La Vega, ' +
    'Cundinamarca y el corredor del Gualivá: qué revisar antes de comprar, tipos de predio y costos.',
  alternates: { canonical: `${SITE_URL}/guia-inversion` },
  openGraph: {
    title: 'Guía Definitiva de Inversión Inmobiliaria en La Vega, Cundinamarca',
    description:
      'Todo lo que necesitas saber antes de invertir en La Vega y el corredor del Gualivá ' +
      'del país: La Vega y el corredor del Gualivá.',
    url: `${SITE_URL}/guia-inversion`,
    type: 'article',
    locale: 'es_CO',
    images: [{ url: `${SITE_URL}${COVER}`, width: 1200, height: 630 }],
  },
};

// ─── FAQ (visible + FAQPage schema; rentabilidad por municipio) ───────────────

// FAQ generales: las que NO dependen de un municipio concreto. Las de municipio
// se generan desde sus datos reales en lib/faq-municipios.ts, porque decian
// «topografias fascinantes» y «perfecto para condominios de lujo» dentro de un
// FAQPage, que es el marcado que mas se extrae.

// ─── Datos de secciones ─────────────────────────────────────────────────────────

// El clima se DERIVA de la ficha del municipio. Decía «un microclima
// envidiable (22°C promedio)»: un adjetivo valorativo y una cifra escrita a
// mano, cuando el rango real está en base y ya se publica derivado en
// /municipios/la-vega con su fecha de corte. Es caso 1 de §2, no caso 4: el
// dato existe, lo que sobraba era el adjetivo y el número inventado.
function valorizacion(clima: { min: number; max: number; altitud: number } | null) {
  return [
  { icon: Sun, title: 'Clima y topografía', text: clima
      ? `La Vega está a ${clima.altitud.toLocaleString('es-CO')} msnm, con temperaturas de ${clima.min} a ${clima.max} °C. Ese rango permite piscina y vida al aire libre durante todo el año.`
      : 'La altitud de La Vega da un rango de temperatura estable durante todo el año, que permite piscina y vida al aire libre.' },
  { icon: Route, title: 'Desarrollo de Infraestructura', text: 'Vías de acceso en constante mejora que conectan rápidamente con la capital, convirtiendo a La Vega en la opción ideal para vivienda principal o turismo de fin de semana.' },
  // «garantizando retornos sólidos» era una garantía de rentabilidad
  // financiera: la clase de promesa que obliga bajo la Ley 1480 de 2011 y que
  // ningún intermediario inmobiliario puede sostener, porque el retorno depende
  // del mercado y no de la empresa. Se sustituye por el hecho observable, que
  // además es lo que un modelo puede citar.
  { icon: TrendingUp, title: 'Demanda de alquiler vacacional', text: 'La demanda de alquileres vacacionales de corta estancia en la región supera a la oferta publicada, lo que sostiene el interés por las propiedades de descanso. La rentabilidad de cada inmueble depende de su ubicación, su estado y las condiciones del mercado en cada momento.' },
  ]
}

const CATALOGO = [
  { icon: LandPlot, title: 'Lotes y Parcelaciones Campestres', text: 'El lienzo en blanco para tu casa ideal. Nos enfocamos en terrenos urbanizados con proyección y seguridad. Proyectos estructurados con visión, como Senderos del Bosque o la Parcelación Cucharal, representan el estándar de lo que un inversionista debe buscar: vías, servicios y proyecciones arquitectónicas claras.' },
  { icon: Trees, title: 'Fincas y Quintas de Descanso', text: 'Propiedades con áreas generosas, árboles frutales y diseños que se integran con la naturaleza. Ideales para el retiro o la explotación turística.' },
  { icon: Building2, title: 'Apartamentos y Proyectos Urbanos', text: 'Para quienes buscan la practicidad del casco urbano sin perder la tranquilidad del municipio. Modernidad, seguridad y fácil mantenimiento en el corazón de La Vega.' },
];

const AUTORIDAD = [
  { icon: Video, title: 'Visión Inmersiva', text: 'Explora propiedades desde Bogotá o el extranjero con nuestros recorridos 360° y cinematografía con drones. Conoce el entorno real antes de viajar.' },
  // «Blindaje Jurídico» sobrevivió al barrido de verbos de resultado porque
  // aquel buscaba «blindaje legal». Afirma un estado de protección; lo que sí
  // hacemos es acompañar y orientar.
  { icon: Scale, title: 'Criterio jurídico', text: 'Te acompañamos en el estudio de títulos y de tradición, y te orientamos sobre qué revisar en la promesa de compraventa.' },
  // «tecnología de vanguardia» es posición comparativa sin referente, y encima
  // reemplazable por el hecho, que dice más y se puede comprobar abriendo
  // WhatsApp a las tres de la mañana.
  { icon: Bot, title: 'Atención con Mac', text: 'Mac, nuestro agente de inteligencia artificial propio, responde en la web y en WhatsApp las 24 horas y consulta el catálogo en tiempo real.' },
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

export default async function GuiaInversionPage() {
  // «Los OTROS municipios además de La Vega»: se excluye por slug, no por
  // nombre, para que no dependa de cómo esté escrito el nombre en la base.
  const corredor = await getMunicipiosConDatos('la-vega');

  // Clima de La Vega desde su ficha, para la tarjeta de la sección 1. Si la
  // base no responde, la tarjeta cae a su versión sin cifras en vez de
  // publicar un número escrito a mano.
  const laVega = (await getMunicipiosConDatos()).find(m => m.slug === 'la-vega') ?? null;
  const climaLaVega = laVega
    ? { min: laVega.temp_min, max: laVega.temp_max, altitud: laVega.altitud_msnm }
    : null;

  // Las FAQ de municipio salen de sus datos reales; las generales, de la
  // constante. Van primero las de municipio porque son las que responden a la
  // consulta con la que llega el visitante («¿conviene invertir en Sasaima?»).
  const FAQS = [...(await faqsDeMunicipios()), ...FAQS_GENERALES];

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

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <RespuestaDirecta {...respuestaGuiaInversion()} />
        </div>

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
            quintas o apartamentos en La Vega y el corredor del Gualivá.
          </p>

          {/* Sección 1 */}
          <section style={{ marginBottom: '3.5rem' }}>
            {/* Decía «¿Por qué La Vega es el Top 1 en Valorización?». Un ranking sin
              medición es caso 4 de §2: no es una cifra frágil, es una afirmación
              factual que nadie ha comprobado, y afirma una posición frente a todo
              un país. La pregunta nueva se responde con las tres tarjetas de
              abajo, que sí describen hechos observables. */}
          <SectionTitle eyebrow="Sección 1">¿Qué sostiene la demanda de vivienda campestre en La Vega?</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {valorizacion(climaLaVega).map(({ icon: Icon, title, text }) => (
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
            <SectionTitle eyebrow="Sección 2">¿Qué tipos de propiedad se pueden comprar en La Vega?</SectionTitle>
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
            <SectionTitle eyebrow="Sección 3">¿Qué otros municipios del Gualivá tienen potencial además de La Vega?</SectionTitle>
            <p style={{ color: '#475569', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1.75rem' }}>
              El auge de La Vega ha impulsado un crecimiento hacia los municipios vecinos, dentro de
              los {DATOS_OFICIALES.municipiosProvincia} de la Provincia del Gualivá donde Su Finca
              Raíz opera. Estos son los que tienen ficha de información propia, con su altitud,
              su rango de temperatura y su distancia real a Bogotá:
            </p>
            {/* La lista se DERIVA de los municipios con página publicada. Antes
                eran cinco escritos a mano —San Francisco, Nocaima, Sasaima,
                Vergara y Villeta— con adjetivos por descripción: «topografías
                fascinantes», «climas templados». Dos faltas a la vez: una lista
                de municipios a mano (§1.3) y adjetivos donde §3 pide
                afirmaciones falsables.
                Ahora cada tarjeta lleva altitud, temperatura y distancia reales,
                que es lo que un modelo puede extraer y citar, y enlaza a la
                página del municipio —que existe por definición: salir de esta
                consulta significa tenerla publicada. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {corredor.map(m => (
                <Link
                  key={m.slug}
                  href={`/municipios/${m.slug}`}
                  style={{ background: '#0D2D5E', borderRadius: 16, padding: '1.5rem 1.4rem', textDecoration: 'none', display: 'block' }}
                >
                  <MapPinned size={22} color="#E8B92F" style={{ marginBottom: 10 }} />
                  <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1.02rem', marginBottom: 8 }}>
                    {m.name}, Cundinamarca
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                    {m.altitud_msnm.toLocaleString('es-CO')} msnm · {m.temp_min}–{m.temp_max} °C
                    <br />
                    {m.distancia_bogota_km} km de Bogotá ({m.tiempo_bogota_min} min)
                  </p>
                </Link>
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
                  Cuéntanos tu objetivo de inversión y te orientamos según lo que busques y el presupuesto que manejes
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
