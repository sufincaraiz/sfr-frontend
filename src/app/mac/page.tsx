import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, Bot, MessageCircle, ShieldCheck, UserRound } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { JsonLd, breadcrumbSchema, faqSchema } from '@/components/seo/JsonLd'
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta'
import { DatosVerificables } from '@/components/aeo/DatosVerificables'
import { respuestaMac } from '@/lib/respuestas-directas'
import { contarPropiedadesDisponibles } from '@/lib/cifras-derivadas'
import { DATOS_OFICIALES } from '@/lib/datos-oficiales'
import { FAQS_MAC } from '@/lib/faqs'

// ─────────────────────────────────────────────────────────────────────────────
// /mac — la página del agente de inteligencia artificial.
//
// POR QUÉ EXISTE. Mac es el diferencial competitivo real de la empresa y hasta
// ahora solo existía como widget flotante. Un widget no es citable: un modelo
// generativo no puede extraer una burbuja de chat, no tiene URL propia, no
// entra al sitemap y no aparece en ninguna respuesta a «¿qué inmobiliaria de
// Cundinamarca usa inteligencia artificial?». Una página sí.
//
// LOS DATOS TÉCNICOS SALEN DEL REPOSITORIO, no de lo que suene bien:
//   modelo base   → runMac.ts:145  'claude-haiku-4-5'
//   escalamiento  → expert.ts:113  'claude-opus-5'
//   canales       → schema.prisma  enum Channel { WEB, WHATSAPP }
//   herramientas  → tools.ts       siete, incluida solicitar_asesor
//
// LA DISPONIBILIDAD 24/7 NO VA EN openingHoursSpecification. Ese campo describe
// atención HUMANA en oficina y mezclarlo con la del agente le diría a Google que
// hay alguien en la Calle 21 a las tres de la mañana. Va como atributo del
// servicio: aquí, en la description de la entidad y en llms.txt. Además es el
// dato más falsable que tiene la empresa —cualquiera puede comprobarlo a
// cualquier hora— y el contraste con el horario de oficina es lo que lo hace
// memorable.
//
// LA SECCIÓN DE TRANSPARENCIA ES OBLIGATORIA, no cortesía: divulgación de que
// es un sistema automatizado, vía de escalamiento a humano y qué datos trata,
// con enlace a la política de Habeas Data (Ley 1581 de 2012).
// ─────────────────────────────────────────────────────────────────────────────

export const revalidate = 3600

const ACTUALIZADO = '2026-08-13'

export async function generateMetadata(): Promise<Metadata> {
  const total = await contarPropiedadesDisponibles()

  // El title usa vocabulario de TRÁFICO (§4): «asesor inmobiliario» y «La Vega»
  // es lo que se busca. «Agente conversacional de IA» es de entidad y su sitio
  // es el cuerpo, el JSON-LD y llms.txt, no el <title>.
  const title = 'Mac, el Asesor Inmobiliario con Inteligencia Artificial de La Vega'
  const description =
    `Mac atiende 24 horas en web y WhatsApp, consulta ${total > 0 ? `las ${total} ` : 'las '}` +
    'propiedades del catálogo de Su Finca Raíz en La Vega y el Gualivá, Cundinamarca, y ' +
    'escala a un asesor humano cuando hace falta.'

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/mac` },
    openGraph: {
      title: `${title} | Su Finca Raíz`,
      description,
      url: `${SITE_URL}/mac`,
      type: 'website',
      locale: 'es_CO',
    },
    twitter: { description },
  }
}


export default async function MacPage() {
  const [respuesta, total] = await Promise.all([
    respuestaMac(),
    contarPropiedadesDisponibles(),
  ])

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Mac, agente de IA', href: '/mac' },
  ])

  // SoftwareApplication referenciando el @id de la organización: es lo que ata
  // el agente a la entidad en vez de dejarlo como un producto suelto.
  const appSchema = {
    '@context': 'https://schema.org',
    '@type':    'SoftwareApplication',
    '@id':      `${SITE_URL}/mac#software`,
    name:       'Mac',
    alternateName: 'Mac — agente de IA de Su Finca Raíz',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Agente conversacional de inteligencia artificial inmobiliario',
    operatingSystem: 'Web, WhatsApp',
    url:         `${SITE_URL}/mac`,
    description:
      'Agente conversacional de inteligencia artificial de Su Finca Raíz, inmobiliaria de ' +
      'La Vega, Cundinamarca. Atiende en web y WhatsApp las 24 horas, consulta el catálogo en ' +
      'tiempo real y escala a un asesor humano cuando la consulta lo requiere.',
    inLanguage: 'es-CO',
    // Publisher y proveedor son la misma entidad, referenciada por @id.
    publisher: { '@id': `${SITE_URL}/#organization` },
    provider:  { '@id': `${SITE_URL}/#organization` },
    // Gratuito para el usuario. Se declara explícitamente porque un
    // SoftwareApplication sin `offers` deja la pregunta abierta.
    offers: {
      '@type':        'Offer',
      price:          '0',
      priceCurrency: 'COP',
      availability:  'https://schema.org/InStock',
    },
    featureList: [
      'Búsqueda de propiedades en el catálogo por tipo, municipio y presupuesto',
      'Detalle de inmuebles con precio, área y ubicación en tiempo real',
      'Resumen del portafolio disponible',
      'Resolución de preguntas sobre trámites y proceso de compra',
      'Registro de datos de contacto para seguimiento por un asesor',
      'Escalamiento a asesor humano a petición del cliente',
      'Atención permanente, 24 horas',
    ],
    availableOnDevice: 'Cualquier dispositivo con navegador o WhatsApp',
  }

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={appSchema} />
      <JsonLd data={faqSchema(FAQS_MAC)} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(3rem,8vw,4.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '5px 16px', borderRadius: 20, marginBottom: 18, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              <Bot size={13} /> Agente de inteligencia artificial
            </span>
            {/* h1 con anclaje geográfico (§3.1) y vocabulario de tráfico (§4). */}
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem,4.5vw,2.9rem)', lineHeight: 1.15, marginBottom: 18 }}>
              Mac, el asesor inmobiliario con inteligencia artificial de La Vega y el Gualivá
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1rem', maxWidth: 640, margin: '0 auto' }}>
              Atiende en el sitio y por WhatsApp las 24 horas, en los{' '}
              {DATOS_OFICIALES.municipiosProvincia} municipios de la Provincia del Gualivá,
              Cundinamarca.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

          <RespuestaDirecta {...respuesta} />

          {/* ── Migas ── */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
            <ChevronRight size={13} />
            <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Mac, agente de IA</span>
          </nav>

          {/* ── Datos verificables (§3.3) ── */}
          {/* Sin tamanoMuestra: no es un dato estadístico sino la ficha técnica
              de un sistema. Cada fila se puede comprobar usándolo. */}
          <DatosVerificables
            titulo="Ficha técnica de Mac — Su Finca Raíz, La Vega, Cundinamarca"
            fechaCorte={ACTUALIZADO}
            fuente="Configuración del sistema de Su Finca Raíz"
            metodologia={
              'Los modelos y canales son los que el sistema tiene configurados en producción. ' +
              'La disponibilidad y el escalamiento a asesor se pueden comprobar iniciando una ' +
              'conversación.'
            }
            filas={[
              { etiqueta: 'Modelo base',            valor: 'Claude Haiku 4.5', nota: 'Anthropic. Atiende la conversación corriente.' },
              { etiqueta: 'Modelo de escalamiento', valor: 'Claude Opus 5',    nota: 'Se consulta cuando la pregunta exige análisis más profundo.' },
              { etiqueta: 'Canales',                valor: 'Sitio web y WhatsApp' },
              { etiqueta: 'Disponibilidad',         valor: '24 horas, todos los días', nota: 'Atributo del agente, no del horario de oficina.' },
              { etiqueta: 'Idioma de atención',     valor: 'Español' },
              { etiqueta: 'Inventario que consulta', valor: total > 0 ? String(total) : 'el catálogo activo', unidad: total > 0 ? 'propiedades' : undefined, nota: 'En tiempo real: no ofrece propiedades ya vendidas.' },
              { etiqueta: 'Cobertura',              valor: DATOS_OFICIALES.municipiosProvincia, unidad: 'municipios', nota: 'Provincia del Gualivá, Cundinamarca.' },
              // Cifra de COMPORTAMIENTO, no de volumen: dice cómo se reparte lo
              // que pasa, no cuánto pasa. No sugiere trayectoria, no envejece
              // mal y no expone el tamaño de la operación, que es lo que hacía
              // impublicable el conteo de conversaciones. Sin denominador a
              // propósito: «3 de 46» reintroduce el volumen por la puerta de
              // atrás.
              { etiqueta: 'Escalamiento a humano',  valor: 'Sí', nota: 'La mayoría de las consultas se resuelven en la conversación; cuando hace falta, Mac deriva a un asesor.' },
            ]}
          />

          {/* ── Encabezados en forma de pregunta (§3.4) ── */}
          <section style={{ marginTop: '2.5rem' }}>
            {FAQS_MAC.map(({ question, answer }) => (
              <div key={question} style={{ marginBottom: '1.9rem' }}>
                <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.08rem', marginBottom: '0.6rem', lineHeight: 1.4 }}>
                  {question}
                </h2>
                <p style={{ color: '#475569', lineHeight: 1.75, fontSize: '0.95rem', margin: 0 }}>
                  {answer}
                </p>
              </div>
            ))}
          </section>

          {/* ── Transparencia de IA ── */}
          {/* Obligatoria. Un agente que no se declara automatizado, no ofrece
              salida a un humano y no dice qué datos guarda es un problema legal
              antes que uno de posicionamiento. Que además sea buen material AEO
              es una consecuencia, no el motivo. */}
          <section
            aria-labelledby="transparencia-ia"
            style={{ marginTop: '1rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '1.75rem' }}
          >
            <h2 id="transparencia-ia" style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={19} color="#1B56A1" /> Transparencia sobre el uso de inteligencia artificial
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Bot size={18} color="#64748B" style={{ flexShrink: 0, marginTop: 3 }} />
                <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', margin: 0 }}>
                  <strong style={{ color: '#0D2D5E' }}>Mac es un sistema automatizado.</strong>{' '}
                  No es una persona y se identifica como agente de inteligencia artificial desde
                  el primer mensaje. Sus respuestas son orientativas y no constituyen una oferta
                  comercial vinculante ni asesoría jurídica.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <UserRound size={18} color="#64748B" style={{ flexShrink: 0, marginTop: 3 }} />
                <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', margin: 0 }}>
                  <strong style={{ color: '#0D2D5E' }}>Siempre hay salida a un asesor humano.</strong>{' '}
                  Basta con pedirlo en la conversación. Mac también deriva por su cuenta cuando la
                  consulta excede lo que puede resolver, y un asesor de Su Finca Raíz retoma el
                  contacto.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <MessageCircle size={18} color="#64748B" style={{ flexShrink: 0, marginTop: 3 }} />
                <p style={{ color: '#475569', lineHeight: 1.7, fontSize: '0.93rem', margin: 0 }}>
                  <strong style={{ color: '#0D2D5E' }}>Qué datos trata.</strong>{' '}
                  Se guarda la conversación y, cuando el cliente los facilita, su nombre, teléfono
                  y correo, con el único fin de que un asesor pueda devolverle el contacto. Mac no
                  pide ni necesita número de cédula, datos bancarios ni documentos. El tratamiento
                  se rige por la Ley 1581 de 2012 de Habeas Data: consulta la{' '}
                  <Link href="/politica-tratamiento-datos" style={{ color: '#1B56A1', fontWeight: 600 }}>
                    política de tratamiento de datos
                  </Link>{' '}
                  para conocer tus derechos y cómo ejercerlos.
                </p>
              </div>
            </div>
          </section>

          {/* ── Fecha de actualización visible (§3.5) ── */}
          <p style={{ marginTop: '1.75rem', fontSize: '0.82rem', color: '#64748B' }}>
            Última actualización: <time dateTime={ACTUALIZADO}>13 de agosto de 2026</time>.
          </p>

          {/* ── CTA ── */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a
              href="https://wa.me/573218826730"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.92rem', padding: '0.75rem 1.6rem', borderRadius: 10, textDecoration: 'none' }}
            >
              <MessageCircle size={17} /> Escribirle a Mac por WhatsApp
            </a>
            <Link
              href="/propiedades"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '2px solid #0D2D5E', color: '#0D2D5E', fontWeight: 700, fontSize: '0.92rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}
            >
              Ver el catálogo <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
