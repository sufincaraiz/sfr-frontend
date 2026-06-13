import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ChevronRight, Video, ShieldCheck, Megaphone } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { VenderForm } from './VenderForm';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Vende tu finca en La Vega, Cundinamarca | Su Finca Raíz',
  description:
    'Vende tu finca, lote o casa campestre en La Vega y el Gualivá con respaldo experto: ' +
    'recorridos 360°, seguridad legal y marketing digital segmentado. Valoración gratis.',
  alternates: { canonical: `${SITE_URL}/vender-mi-finca` },
  openGraph: {
    title: 'Vende tu propiedad en La Vega con respaldo experto | Su Finca Raíz',
    description:
      'Conectamos tu finca, lote o casa campestre con los inversionistas correctos. ' +
      'Visibilidad 360°, seguridad legal y alcance comercial estratégico.',
    url: `${SITE_URL}/vender-mi-finca`,
    type: 'website',
    locale: 'es_CO',
    images: [{ url: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`, width: 1200, height: 630 }],
  },
};

// ─── Beneficios ────────────────────────────────────────────────────────────────

const BENEFICIOS = [
  {
    icon: Video,
    title: 'Visibilidad Inmersiva de Alto Nivel',
    text: 'Destacamos tu propiedad mediante recorridos virtuales 360° y cinematografía aérea con drones, permitiendo que compradores serios exploren cada rincón del predio desde su celular.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad Legal Absoluta',
    text: 'Protegemos tu patrimonio. Nos encargamos de la revisión de títulos, validación jurídica y la redacción estratégica de la promesa de compraventa para un cierre de negocio sin riesgos.',
  },
  {
    icon: Megaphone,
    title: 'Alcance Comercial Estratégico',
    text: 'A través de nuestro ecosistema y alianzas clave, impulsamos tu inmueble con campañas avanzadas de marketing digital segmentado para acelerar de manera efectiva la venta.',
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function VenderMiFincaPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Vende tu finca', href: '/vender-mi-finca' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.5rem,7vw,4.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              Vende con nosotros
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.8rem,4.5vw,2.9rem)', lineHeight: 1.15, marginBottom: 16 }}>
              Vende tu propiedad en La Vega con tranquilidad y respaldo experto.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1.05rem', maxWidth: 620, margin: '0 auto' }}>
              Transformamos la forma de vender fincas, lotes y casas campestres en Cundinamarca.
              Conectamos tu predio con los inversionistas correctos a través de
              tecnología de vanguardia y blindaje legal integral.
            </p>
            <a
              href="#formulario"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 28, background: '#E8B92F', color: '#0D2D5E', fontWeight: 800, fontSize: '0.95rem', padding: '13px 28px', borderRadius: 12, textDecoration: 'none' }}
            >
              Quiero vender mi propiedad <ChevronRight size={17} />
            </a>
          </div>
        </section>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1100, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Vende tu finca</span>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>

          {/* ── ¿Por qué con nosotros? ── */}
          <section style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
              <div style={{ width: 4, height: 24, background: '#E8B92F', borderRadius: 2 }} />
              <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: 'clamp(1.3rem,3vw,1.7rem)', margin: 0 }}>
                ¿Por qué promover tu predio con nosotros?
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {BENEFICIOS.map(({ icon: Icon, title, text }) => (
                <div key={title} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.75rem 1.5rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 12, background: '#EFF6FF', marginBottom: '1.1rem' }}>
                    <Icon size={26} color="#1B56A1" />
                  </div>
                  <h3 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.3, marginBottom: 10 }}>
                    {title}
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.65 }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Formulario ── */}
          <section id="formulario" style={{ scrollMarginTop: '2rem' }}>
            <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(13,45,94,0.06)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0D2D5E, #1B56A1)', padding: '1.75rem 1.75rem 1.5rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.3rem', marginBottom: 6 }}>
                  Registra tu propiedad
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  Déjanos tus datos y un asesor te contactará en menos de 24 horas para coordinar la valoración.
                </p>
              </div>
              <div style={{ padding: '1.75rem' }}>
                <VenderForm />
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
