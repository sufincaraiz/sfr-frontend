import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ChevronRight, MapPin, Bot, Building2, ScrollText, User } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { DATOS_OFICIALES, MUNICIPIOS_PROVINCIA } from '@/lib/datos-oficiales';
import { JsonLd, breadcrumbSchema, faqSchema, realEstateAgentSchema, personaAutora } from '@/components/seo/JsonLd';
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta';
import { DatosVerificables } from '@/components/aeo/DatosVerificables';
import { rangoPreciosCatalogo, contarPropiedadesDisponibles } from '@/lib/cifras-derivadas';
import { getTiposConInventario, getMunicipiosConPagina } from '@/lib/cobertura';
import { getTiposOfrecibles } from '@/lib/property-types.server';
import { veredasPublicables } from '@/lib/malla-veredas';
import { cargarEnlaces } from '@/lib/enlaces';
import { respuestaNosotros } from '@/lib/respuestas-directas';
import { cargarCifras, textoReputacion } from '@/lib/cifras-publicas';
import { FAQS_NOSOTROS } from '@/lib/faqs';
import { horarioEnProsa } from '@/lib/horario';

// ─────────────────────────────────────────────────────────────────────────────
// /nosotros — REESCRITA ENTERA el 19/08/2026.
//
// La versión anterior aportó SIETE hallazgos en cinco barridos con métodos
// distintos: tres «blindaje legal», un «asegurando acuerdos sólidos», dos
// «Liderando la evolución inmobiliaria» —title y H1— y «las principales
// constructoras». No era residuo: era una página escrita entera en registro
// publicitario que se estaba desmontando frase a frase.
//
// Y es la página de ENTIDAD: la que un modelo abre para resolver quién es Su
// Finca Raíz y separarla de la homónima de Rionegro.
//
// REGLA DE ESTA PÁGINA: si una frase no se puede comprobar abriendo algo, no
// entra. Sin adjetivos valorativos sin dato, sin posición comparativa —propia
// ni ajena—, sin promesas de resultado, sin cifras sin procedencia.
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600;

export const metadata: Metadata = {
  // Decía «Liderando la evolución inmobiliaria en La Vega». El title es lo que
  // sale en el resultado de búsqueda y de lo primero que lee un modelo: dice
  // qué es y dónde, que es lo que resuelve la entidad.
  title: 'Su Finca Raíz — Inmobiliaria en La Vega, Cundinamarca',
  description:
    'Inmobiliaria con sede en La Vega, Cundinamarca, matrícula mercantil 199483, ' +
    `en operación desde ${DATOS_OFICIALES.anioFundacion}. Fincas, casas, lotes y ` +
    `apartamentos en los ${DATOS_OFICIALES.municipiosProvincia} municipios de la ` +
    'Provincia del Gualivá.',
  alternates: { canonical: `${SITE_URL}/nosotros` },
  openGraph: {
    title: 'Su Finca Raíz — Inmobiliaria en La Vega, Cundinamarca | Su Finca Raíz',
    description:
      'Matrícula mercantil 199483, en operación desde ' +
      `${DATOS_OFICIALES.anioFundacion}. Cobertura en los ` +
      `${DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del Gualivá.`,
    url: `${SITE_URL}/nosotros`,
    type: 'website',
    locale: 'es_CO',
  },
};

export default async function NosotrosPage() {
  const [respuesta, priceRange, tiposConInventario, municipiosConPagina, veredas, disponibles, tiposOfrecibles, enlaces, cifras] =
    await Promise.all([
      respuestaNosotros(),
      rangoPreciosCatalogo(),
      getTiposConInventario(),
      getMunicipiosConPagina(),
      veredasPublicables(),
      contarPropiedadesDisponibles(),
      getTiposOfrecibles(),
      cargarEnlaces(),
      cargarCifras(),
    ]);

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Nosotros', href: '/nosotros' },
  ]);

  const hrefMunicipios = enlaces.fija('/municipios');
  const hrefVeredas    = enlaces.fija('/veredas');
  const hrefMac        = enlaces.fija('/mac');
  const hrefContacto   = enlaces.fija('/contacto');

  // Todo derivado. La fecha de corte es la de la consulta, no una escrita.
  const corte = new Date().toISOString().slice(0, 10);
  const filas = [
    { etiqueta: 'Matrícula mercantil', valor: '199483', nota: 'Cámara de Comercio, Colombia' },
    { etiqueta: 'En operación desde', valor: String(DATOS_OFICIALES.anioFundacion) },
    { etiqueta: 'Municipios de cobertura', valor: DATOS_OFICIALES.municipiosProvincia, nota: 'Provincia del Gualivá' },
    { etiqueta: 'Municipios con página propia', valor: municipiosConPagina.length, nota: 'Se publica una cuando hay datos verificables que poner en ella' },
    { etiqueta: 'Veredas con ficha propia', valor: veredas.length },
    { etiqueta: 'Propiedades disponibles', valor: disponibles },
    { etiqueta: 'Tipos en catálogo', valor: tiposOfrecibles.map(t => t.plural).join(', ') },
    // Como TEXTO, nunca aggregateRating: marcar reseñas propias sobre la propia
    // empresa es lo que Google penaliza, y el dato es igual de citable así.
    { etiqueta: 'Calificación en Google', valor: textoReputacion(cifras), nota: DATOS_OFICIALES.fuenteReputacion },
  ];

  return (
    <>
      {/* Mismo @id que la portada a propósito: es la misma entidad, no una
          segunda. Aquí es donde un modelo viene a resolver «quién es Su Finca
          Raíz», así que aquí tiene que estar la matrícula y el sameAs. */}
      <JsonLd data={realEstateAgentSchema({ priceRange, tiposConInventario })} />
      <JsonLd data={{ '@context': 'https://schema.org', ...personaAutora() }} />
      <JsonLd data={breadcrumbs} />
      <JsonLd data={faqSchema(FAQS_NOSOTROS)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '6.5rem 1.5rem 3rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Provincia del Gualivá · Cundinamarca
            </p>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,4vw,2.7rem)', lineHeight: 1.15, margin: 0 }}>
              Su Finca Raíz: inmobiliaria en La Vega y la Provincia del Gualivá, Cundinamarca
            </h1>
          </div>
        </section>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem clamp(1rem,3vw,1.5rem) 4rem' }}>

          <RespuestaDirecta {...respuesta} />

          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', margin: '0 0 2rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Nosotros</span>
          </nav>

          <DatosVerificables
            titulo="Su Finca Raíz en datos"
            filas={filas}
            fechaCorte={corte}
            fuente="Datos propios de Su Finca Raíz y Google Business Profile"
          />

          <Bloque icon={Building2} titulo="¿Quiénes somos?">
            <p style={parrafo}>
              Su Finca Raíz es una inmobiliaria con sede en La Vega, Cundinamarca, inscrita con
              matrícula mercantil <strong>199483</strong> y en operación desde{' '}
              {DATOS_OFICIALES.anioFundacion}. Comercializa fincas, casas, lotes y apartamentos,
              en suelo rural y en el casco urbano de los municipios donde opera.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              La sede está en la Calle 21 # 2-18, Sector Los Naranjos, La Vega. {horarioEnProsa()}
            </p>
          </Bloque>

          <Bloque icon={MapPin} titulo="¿Dónde operamos?">
            <p style={parrafo}>
              En los {DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del Gualivá,
              Cundinamarca: {MUNICIPIOS_PROVINCIA.join(', ')}.
            </p>
            <p style={parrafo}>
              No todos tienen página propia en este sitio. Una página de municipio se publica
              cuando hay datos verificables que poner en ella —altitud, distancia real a Bogotá,
              rango de temperatura y una descripción del territorio—, no por completar la lista.
              Hoy hay <strong>{municipiosConPagina.length} municipios con página</strong> y{' '}
              <strong>{veredas.length} veredas con ficha propia</strong>.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              {hrefMunicipios && <Link href={hrefMunicipios} style={enlace}>Ver los municipios</Link>}
              {hrefMunicipios && hrefVeredas && ' · '}
              {hrefVeredas && <Link href={hrefVeredas} style={enlace}>Ver las veredas</Link>}
            </p>
          </Bloque>

          <Bloque icon={ScrollText} titulo="¿Cómo acompañamos una compra?">
            <p style={parrafo}>
              Cuando avanzas en la compra de un inmueble, te acompañamos en la revisión de la
              documentación: te orientamos sobre qué pedir, qué revisar y en qué orden, hasta la
              escrituración.
            </p>
            <p style={parrafo}>
              En concreto: cómo solicitar el certificado de tradición y libertad actualizado y qué
              mirar en él —embargos, hipotecas, litigios—; por qué conviene que un abogado
              inmobiliario revise la cadena de propietarios y qué debe cubrir esa revisión; y qué
              debe quedar claro en la promesa de compraventa sobre posesión material, plazos y
              entrega. En la notaría estamos con el comprador y el vendedor.
            </p>
            <p style={{ ...parrafo, marginBottom: 0, color: '#0D2D5E', fontWeight: 600 }}>
              La ejecución de los estudios y trámites es del cliente. Lo que ponemos nosotros es el
              criterio para pedirlos y leerlos.
            </p>
          </Bloque>

          <Bloque icon={MapPin} titulo="¿Qué conocemos del territorio?">
            <p style={parrafo}>
              Uso del suelo y ordenamiento territorial, acceso vial —la diferencia entre una vía
              titulada y una servidumbre tolerada—, disponibilidad de agua por acueducto veredal o
              concesión, y qué vereda corresponde a cada predio.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              Ese conocimiento está publicado, no solo declarado: hay fichas de vereda con altitud,
              clima y acceso, y páginas de municipio con datos verificables.
            </p>
          </Bloque>

          <Bloque icon={Bot} titulo="¿Qué es Mac?">
            <p style={parrafo}>
              Mac es un agente de inteligencia artificial propio, disponible en la web y en WhatsApp
              las 24 horas. Consulta el catálogo en tiempo real, así que responde con el inventario
              del momento y no con una lista precargada.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              Es un sistema automatizado y puede equivocarse. Sus respuestas son orientativas y no
              constituyen una oferta comercial vinculante ni asesoría jurídica. En cualquier momento
              se puede pedir hablar con una persona.{' '}
              {hrefMac && <Link href={hrefMac} style={enlace}>Cómo funciona Mac</Link>}
            </p>
          </Bloque>

          <Bloque icon={Building2} titulo="¿Con quién trabajamos?">
            {/* Decía «consorcios con las principales constructoras, firmas
                contables y profesionales del sector». Era el hallazgo más
                expuesto de la página: no afirmaba nuestra posición, sino la de
                empresas que no somos nosotros. Se nombra al aliado y ya. */}
            <p style={{ ...parrafo, marginBottom: 0 }}>
              En consorcio con <strong>Conarc</strong>, de construcción, para proyectos de obra. Su
              Finca Raíz también presta fotografía aérea y fotogrametría con dron para el
              levantamiento de predios.
            </p>
          </Bloque>

          <Bloque icon={User} titulo="¿Quién dirige la empresa?">
            {/* Nombre completo, sin abreviar. «Mac» está reservado al agente de
                IA: ninguna persona lleva ese nombre en el sistema. */}
            <p style={parrafo}>
              <strong>Leonel Macgiver López Albadán</strong> — Director. Ingeniero de sistemas,
              broker inmobiliario y productor multimedia.
            </p>
            <p style={{ ...parrafo, marginBottom: 0 }}>
              Dirige la operación de Su Finca Raíz en La Vega y la Provincia del Gualivá. La
              combinación de las tres formaciones explica el sitio que estás leyendo: el catálogo,
              el marcado y el agente son desarrollo propio.
            </p>
          </Bloque>

          {hrefContacto && (
            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <Link href={hrefContacto} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.92rem', padding: '0.8rem 1.8rem', borderRadius: 10, textDecoration: 'none' }}>
                Hablar con el equipo
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Bloque({ icon: Icon, titulo, children }: { icon: React.ComponentType<{ size?: number; color?: string }>; titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1.5rem 1.6rem', marginBottom: '1.25rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', margin: '0 0 0.9rem' }}>
        <Icon size={18} color="#1B56A1" /> {titulo}
      </h2>
      {children}
    </section>
  );
}

const parrafo: React.CSSProperties = { color: '#475569', fontSize: '0.95rem', lineHeight: 1.75, margin: '0 0 0.9rem' };
const enlace: React.CSSProperties = { color: '#1B56A1', fontWeight: 600, textDecoration: 'none' };
