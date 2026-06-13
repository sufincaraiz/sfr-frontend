import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ChevronRight, MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { ContactoForm } from './ContactoForm';

export const metadata: Metadata = {
  title: 'Contáctanos — Asesoría inmobiliaria en La Vega | Su Finca Raíz',
  description:
    'Hablemos. Asesoría gratis para comprar, vender o invertir en fincas, lotes y ' +
    'casas campestres en La Vega y el Gualivá, Cundinamarca. WhatsApp +57 321 882 6730.',
  alternates: { canonical: `${SITE_URL}/contacto` },
  openGraph: {
    title: 'Contáctanos | Su Finca Raíz',
    description:
      'Asesoría gratis para comprar, vender o invertir en finca raíz en La Vega, Cundinamarca.',
    url: `${SITE_URL}/contacto`,
    type: 'website',
    locale: 'es_CO',
  },
};

const WA_URL = 'https://wa.me/573218826730?text=' +
  encodeURIComponent('¡Hola! Quiero asesoría con Su Finca Raíz.');

const CANALES = [
  { icon: MessageCircle, label: 'WhatsApp', value: '+57 321 882 6730', href: WA_URL, bg: '#25D366' },
  { icon: Phone,         label: 'Teléfono', value: '+57 321 882 6730', href: 'tel:+573218826730', bg: '#1B56A1' },
  { icon: Mail,          label: 'Correo',   value: 'sufincaraiz.comercial@gmail.com', href: 'mailto:sufincaraiz.comercial@gmail.com', bg: '#0D2D5E' },
];

export default function ContactoPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Contacto', href: '/contacto' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.5rem,7vw,4rem) 1.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              Contáctanos
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,4.5vw,2.7rem)', lineHeight: 1.15, marginBottom: 14 }}>
              Hablemos de tu próxima propiedad.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1.02rem', maxWidth: 600, margin: '0 auto' }}>
              Ya sea que quieras vender, invertir o encontrar tu refugio campestre en La Vega,
              nuestro equipo te asesora sin costo. Escríbenos y te respondemos en menos de 24 horas.
            </p>
          </div>
        </section>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1100, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Contacto</span>
        </nav>

        <div className="contacto-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>

          {/* ── Canales directos ── */}
          <section aria-label="Canales de contacto" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.25rem' }}>
              Canales directos
            </h2>

            {CANALES.map(({ icon: Icon, label, value, href, bg }) => (
              <a
                key={label}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1rem 1.1rem', textDecoration: 'none' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: bg, flexShrink: 0 }}>
                  <Icon size={21} color="#fff" />
                </span>
                <span>
                  <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                  <span style={{ display: 'block', color: '#0D2D5E', fontSize: '0.95rem', fontWeight: 700, wordBreak: 'break-word' }}>{value}</span>
                </span>
              </a>
            ))}

            {/* Dirección */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '1rem 1.1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: '#E8B92F', flexShrink: 0 }}>
                <MapPin size={21} color="#0D2D5E" />
              </span>
              <span>
                <span style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dirección</span>
                <span style={{ display: 'block', color: '#0D2D5E', fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.45 }}>
                  Calle 21 #2-18, Calle Los Naranjos,<br />La Vega, Cundinamarca
                </span>
              </span>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
              Horario de atención: Lunes a Sábado, 8:00 a.m. – 6:00 p.m.
            </p>
          </section>

          {/* ── Formulario ── */}
          <section aria-label="Formulario de contacto">
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 24px rgba(13,45,94,0.06)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0D2D5E, #1B56A1)', padding: '1.6rem 1.75rem 1.4rem' }}>
                <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', marginBottom: 6 }}>
                  Escríbenos
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  Déjanos tus datos y un asesor te contactará en menos de 24 horas.
                </p>
              </div>
              <div style={{ padding: '1.75rem' }}>
                <ContactoForm />
              </div>
            </div>
          </section>

        </div>
      </main>

      <style>{`
        .contacto-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
          gap: 2.5rem;
          align-items: start;
        }
        @media (max-width: 860px) {
          .contacto-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
