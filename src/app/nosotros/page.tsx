import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  Home, ChevronRight, Rotate3d, Plane, Box,
  Eye, ShieldCheck, Network, ArrowRight,
  Bot, Sparkles, Lightbulb, Layers, Building2,
} from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { DATOS_OFICIALES } from '@/lib/datos-oficiales';
import { JsonLd, breadcrumbSchema, faqSchema, realEstateAgentSchema, personaAutora } from '@/components/seo/JsonLd';
import { AutorArticulo } from '@/components/aeo/AutorArticulo';
import { rangoPreciosCatalogo } from '@/lib/cifras-derivadas';
import { getTiposConInventario } from '@/lib/cobertura';
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta';
import { TaglineMarca } from '@/components/layout/TaglineMarca';
import { respuestaNosotros } from '@/lib/respuestas-directas';
import { FAQS_NOSOTROS } from '@/lib/faqs';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Nosotros — Centro de Negocios Inmobiliarios en La Vega',
  description:
    'Conoce a Su Finca Raíz: tecnología inmersiva (recorridos 360°, drones), ' +
    'criterio jurídico y conocimiento del territorio para comprar y vender fincas, ' +
    'lotes y casas campestres en La Vega, Cundinamarca.',
  alternates: { canonical: `${SITE_URL}/nosotros` },
  openGraph: {
    title: 'Nosotros — Liderando la evolución inmobiliaria en La Vega | Su Finca Raíz',
    description:
      'Fusionamos conocimiento del territorio, tecnología inmersiva de vanguardia ' +
      'y criterio jurídico para acompañar tu inversión en Cundinamarca.',
    url: `${SITE_URL}/nosotros`,
    type: 'website',
    locale: 'es_CO',
    images: [{ url: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`, width: 1200, height: 630 }],
  },
};

// ─── Datos de contenido ────────────────────────────────────────────────────────

const TECNOLOGIA = [
  {
    icon: Rotate3d,
    title: 'Recorridos Inmersivos 360°',
    text: 'Reducimos las distancias y optimizamos tu tiempo. Gracias a nuestra tecnología de fotografía panorámica e interactiva, puedes explorar cada rincón, textura y dimensiones de los inmuebles y condominios desde cualquier lugar del mundo.',
  },
  {
    icon: Plane,
    title: 'Cinematografía y Topografía con Drones',
    text: 'Capturamos la verdadera esencia y el entorno de cada predio. Utilizamos herramientas aéreas de alta resolución para ofrecer perspectivas reales de linderos, topografía, vías de acceso y el paisaje natural de Cundinamarca.',
  },
  {
    icon: Box,
    title: 'Renders e Inteligencia Visual',
    text: 'Proyectamos el potencial de la tierra. Facilitamos la visualización de futuros desarrollos, cabañas minimalistas y proyectos arquitectónicos mediante modelado digital avanzado.',
  },
];

// ── Inmobiliaria inteligente: 6 servicios (contenido exacto del posicionamiento) ─
const INTELIGENTE = [
  {
    icon: Bot,
    title: 'Mac — Agente IA experto inmobiliario, 24/7 y en cualquier idioma',
    text: 'Mac es nuestro asesor con inteligencia artificial: analiza tu necesidad, compara propiedades y genera respuestas en minutos, los 7 días de la semana, las 24 horas. Atiende y asesora en cualquier idioma, para que inversionistas locales y extranjeros reciban respuesta inmediata.',
  },
  {
    icon: Rotate3d,
    title: 'Recorridos virtuales 360° con asistencia IA inmediata',
    text: 'Explora cada propiedad desde donde estés con nuestros recorridos virtuales inmersivos, y resuelve tus dudas al instante con el apoyo de Mac. Conoce la finca antes de visitarla.',
  },
  {
    icon: Sparkles,
    title: 'Búsqueda con recomendaciones inteligentes',
    text: 'Cuéntanos qué buscas y nuestra tecnología te recomienda las propiedades que de verdad se ajustan a tus necesidades: presupuesto, ubicación, tipo de inmueble y estilo de vida.',
  },
  {
    icon: Lightbulb,
    title: 'Aterrizamos tu idea con herramientas tecnológicas',
    text: '¿Tienes una idea de inversión, parcelación o proyecto campestre? Te ayudamos a estructurarla y validarla con herramientas de análisis y visualización, para que tomes decisiones con datos y no con suposiciones.',
  },
  {
    icon: Layers,
    title: 'Elaboración ágil de proyectos inmobiliarios',
    text: 'Mediante parametrización y renderización, convertimos conceptos en propuestas visuales de proyectos inmobiliarios en tiempos que el mercado tradicional no puede igualar.',
  },
  {
    icon: Building2,
    title: 'Construcción a otro nivel — Alianza con Constructora Conarc',
    text: 'A través de nuestra alianza con Constructora Conarc, implementamos tecnología de realidad aumentada para que veas tu proyecto desde una mejor perspectiva y tomes decisiones puntuales antes y durante la construcción.',
  },
];

// ── Preguntas frecuentes (visibles + schema FAQPage) ──────────────────────────

const FILOSOFIA = [
  {
    icon: Eye,
    title: 'Transparencia Absoluta',
    text: 'Creemos en los negocios claros. Toda la información de nuestro portafolio, áreas y estados jurídicos es validada rigurosamente antes de ser publicada. Eliminamos las sorpresas en el camino.',
  },
  {
    icon: ShieldCheck,
    // Decía «Blindaje Legal» y «asegurando acuerdos sólidos». Sobrevivió al
    // barrido de verbos de resultado porque aquel buscaba «blindaje legal» en
    // minúscula y este vive dentro de un array con otra capitalización.
    title: 'Responsabilidad y criterio jurídico',
    text: 'Te acompañamos en el estudio de títulos y de matrículas inmobiliarias, y te orientamos sobre qué debe quedar claro en la promesa de compraventa: condiciones de posesión material, plazos y entrega. La decisión y la firma son tuyas; el criterio para tomarlas, lo ponemos nosotros.',
  },
  {
    icon: Network,
    title: 'Ecosistema de Cooperación',
    text: 'Operamos bajo un modelo colaborativo mediante alianzas estratégicas y consorcios con las principales constructoras, firmas contables y profesionales del sector, permitiéndonos ofrecer un servicio integral "llave en mano".',
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────────

export default async function NosotrosPage() {
  const respuesta = respuestaNosotros();
  const [priceRange, tiposConInventario] = await Promise.all([
    rangoPreciosCatalogo(),
    getTiposConInventario(),
  ]);
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Nosotros', href: '/nosotros' },
  ]);

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
    padding: '1.6rem 1.4rem', height: '100%',
  };
  const iconWrap: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 50, height: 50, borderRadius: 12, background: '#EFF6FF', marginBottom: '1rem',
  };

  return (
    <>
      {/* La doctrina §5 exige RealEstateAgent en «/» y en «/nosotros». Estaba
          solo en la portada: la página que un modelo abre para resolver «quién
          es Su Finca Raíz» salía sin identidad, sin matrícula y sin sameAs, que
          es justo el material contra la homónima antioqueña. Mismo @id que la
          portada a propósito: es la misma entidad, no una segunda. */}
      <JsonLd data={realEstateAgentSchema({ priceRange, tiposConInventario })} />
      {/* La Person que firma los artículos, con el MISMO @id que usa cada
          BlogPosting. Aquí es donde su `url` apunta, así que aquí es donde tiene
          que estar declarada y visible: es lo que convierte una firma repetida
          en una entidad resoluble. */}
      <JsonLd data={{ '@context': 'https://schema.org', ...personaAutora() }} />
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqSchema(FAQS_NOSOTROS)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── 1. Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '6rem 1.5rem 3rem' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              Nosotros
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem,4.5vw,2.9rem)', lineHeight: 1.15, marginBottom: 18 }}>
              Liderando la evolución inmobiliaria en La Vega, Cundinamarca.
            </h1>
            <h2 style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, lineHeight: 1.7, fontSize: 'clamp(1rem,2.2vw,1.2rem)', maxWidth: 700, margin: '0 auto' }}>
              Fusionamos el conocimiento profundo del territorio con tecnología inmersiva
              de vanguardia y criterio jurídico para acompañarte en cada decisión.
            </h2>
            {/* Datos verificables en el HTML servido, con su fuente citada.
                La calificación NO lleva marcado aggregateRating a propósito: las
                directrices de Google prohíben el marcado de reseñas
                autorreferenciales y arriesga los resultados enriquecidos de todo
                el dominio. Texto visible sí, schema no. */}
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', fontWeight: 600, marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span>Inmobiliaria de La Vega, Cundinamarca · Matrícula mercantil 199483</span>
              <span aria-hidden="true">·</span>
              <span>En operación desde {DATOS_OFICIALES.anioFundacion}</span>
              <span aria-hidden="true">·</span>
              <span>{DATOS_OFICIALES.googleRatingTexto}</span>
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <RespuestaDirecta {...respuesta} />
          {/* Después de la respuesta directa, nunca antes: ver TaglineMarca. */}
          <TaglineMarca />
          {/* Respaldo visible de la Person del marcado. Sin esto, el @id que
              firma cada artículo apuntaría a una página donde esa persona no
              existe. */}
          <AutorArticulo enPaginaPropia />
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1180, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Nosotros</span>
        </nav>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem 1.5rem 4rem' }}>

          {/* ── 2. Quiénes Somos ── */}
          <section style={{ marginBottom: '4rem', maxWidth: 820 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                Quiénes Somos
              </h2>
            </div>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.75, marginBottom: '1.2rem' }}>
              Su Finca Raíz es un Centro de Negocios Inmobiliarios integral con epicentro en
              La Vega, Cundinamarca, especializado en la promoción, comercialización y
              consultoría jurídica de fincas, lotes urbanizados, proyectos de parcelación y
              casas campestres.
            </p>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.75 }}>
              Nacimos con el firme propósito de transformar el sector tradicional. No somos
              simplemente un portal de anuncios; somos una plataforma tecnológica y un equipo
              de expertos dedicados a acortar los tiempos de búsqueda y a acompañar cada
              transacción —estudio de títulos, promesa de compraventa y escrituración— para
              compradores, vendedores e inversionistas.
            </p>
          </section>

          {/* ── 3. Centro de negocios inmobiliarios impulsado por IA ── */}
          <section style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                Un centro de negocios inmobiliarios impulsado por inteligencia artificial
              </h2>
            </div>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: 1.75, marginBottom: '2rem', maxWidth: 820 }}>
              Su Finca Raíz es un centro de negocios inmobiliarios impulsado por inteligencia
              artificial en La Vega y el Gualivá, Cundinamarca. La tecnología atraviesa cada etapa
              del negocio: un equipo del territorio, apoyado en herramientas de IA, y Mac, un
              agente propio que atiende en web y WhatsApp las 24 horas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {INTELIGENTE.map(({ icon: Icon, title, text }) => (
                <article key={title} style={cardStyle}>
                  <span style={iconWrap}><Icon size={25} color="#1B56A1" /></span>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.3, marginBottom: 9 }}>{title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{text}</p>
                </article>
              ))}
            </div>

            <p style={{ color: '#0D2D5E', fontWeight: 600, fontSize: '1.02rem', lineHeight: 1.75, marginTop: '2rem', maxWidth: 820 }}>
              Tecnología al servicio de la confianza: cada herramienta que usamos existe para que
              compres, vendas o inviertas en el Gualivá con más información, más rapidez y más
              respaldo. Eso es ser una inmobiliaria inteligente.
            </p>
          </section>

          {/* ── 3b. La Vanguardia Tecnológica ── */}
          <section style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                La Vanguardia Tecnológica
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {TECNOLOGIA.map(({ icon: Icon, title, text }) => (
                <article key={title} style={cardStyle}>
                  <span style={iconWrap}><Icon size={25} color="#1B56A1" /></span>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.3, marginBottom: 9 }}>{title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{text}</p>
                </article>
              ))}

              {/* 4ª tarjeta — Mac con imagen del personaje de marca */}
              <article style={{ ...cardStyle, background: 'linear-gradient(160deg, #0D2D5E, #1B56A1)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', height: 150, marginBottom: '0.75rem' }}>
                  <Image
                    src="/mac-avatar.webp"
                    alt="Mac, asistente especializado de Su Finca Raíz en La Vega Cundinamarca"
                    fill
                    sizes="(max-width: 768px) 100vw, 280px"
                    style={{ objectFit: 'contain', objectPosition: 'center bottom' }}
                  />
                </div>
                <h3 style={{ color: '#E8B92F', fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.3, marginBottom: 9 }}>
                  Asistencia Especializada con Mac
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Mac es nuestro asistente especializado de Su Finca Raíz, dedicado a ofrecer
                  atención inmediata, orientar tus consultas preliminares y conectarte de forma
                  fluida con nuestro ecosistema de negocios.
                </p>
              </article>
            </div>
          </section>

          {/* ── 4. Filosofía Corporativa ── */}
          <section style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                Filosofía Corporativa
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FILOSOFIA.map(({ icon: Icon, title, text }) => (
                <article key={title} style={cardStyle}>
                  <span style={iconWrap}><Icon size={25} color="#1B56A1" /></span>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.3, marginBottom: 9 }}>{title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>{text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ── 5. Preguntas Frecuentes ── */}
          <section style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                Preguntas Frecuentes
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 820 }}>
              {FAQS_NOSOTROS.map(({ question, answer }) => (
                <article key={question} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.4rem 1.5rem' }}>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.35, marginBottom: 8 }}>{question}</h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.7, margin: 0 }}>{answer}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ── 6. Cierre / CTA ── */}
          <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', borderRadius: 20, padding: 'clamp(2rem,5vw,3.25rem)', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.1rem)', lineHeight: 1.2, marginBottom: 14 }}>
              El respaldo que necesitas para tu próximo paso.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.02rem', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 2rem' }}>
              Ya sea que busques el refugio campestre ideal para escapar de la ciudad o la
              próxima gran oportunidad de inversión en la región, en Su Finca Raíz lo hacemos
              realidad.
            </p>
            <Link
              href="/propiedades"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.98rem', padding: '14px 30px', borderRadius: 12, textDecoration: 'none' }}
            >
              Explorar el Portafolio <ArrowRight size={17} />
            </Link>
          </section>

        </div>
      </main>
    </>
  );
}
