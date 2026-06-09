import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';

const PROPERTY_LINKS = [
  { href: '/fincas-en-venta',         label: 'Fincas en venta' },
  { href: '/fincas-en-venta/la-vega', label: 'Fincas en La Vega' },
  { href: '/fincas-en-venta/sasaima', label: 'Fincas en Sasaima' },
  { href: '/lotes-en-venta',          label: 'Lotes en venta' },
  { href: '/condominios-campestres',  label: 'Condominios campestres' },
];

const COMPANY_LINKS = [
  { href: '/nosotros',        label: 'Nosotros' },
  { href: '/vender-mi-finca', label: 'Vende tu finca' },
  { href: '/blog',            label: 'Blog' },
  { href: '/contacto',        label: 'Contacto' },
];

const LEGAL_LINKS = [
  { href: '/politica-tratamiento-datos', label: 'Política de datos' },
  { href: '/terminos-y-condiciones',     label: 'Términos y condiciones' },
  { href: '/politica-de-cookies',        label: 'Política de cookies' },
];

const MUNICIPIOS = ['La Vega', 'Sasaima', 'Nocaima', 'Villeta', 'San Francisco', 'Supatá'];

// SVG icons para redes sociales no incluidas en Lucide
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/>
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/sufincaraizlavega/', label: 'Instagram', Icon: IconInstagram },
  { href: 'https://www.facebook.com/inmobiliariasufincaraiz', label: 'Facebook', Icon: IconFacebook },
  { href: 'https://www.tiktok.com/@sufincaraiz', label: 'TikTok', Icon: IconTikTok },
  { href: 'https://www.youtube.com/@sufincaraiz_lavega', label: 'YouTube', Icon: IconYouTube },
];

export function Footer() {
  return (
    <footer style={{ background: '#0D2D5E', color: 'rgba(255,255,255,0.8)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand + NAP */}
          <div className="space-y-4">
            <Link href="/">
              <span className="font-sans font-bold text-2xl text-white tracking-tight">
                Su Finca Raíz
              </span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Inmobiliaria local especializada en fincas, lotes y casas campestres en La Vega y
              la región del Gualivá, Cundinamarca.
            </p>

            {/* NAP — datos reales */}
            <address className="not-italic text-sm space-y-2.5">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#E8B92F' }} />
                <span>Calle 21 # 2-18 Los Naranjos, La Vega, Cundinamarca</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={15} className="flex-shrink-0" style={{ color: '#E8B92F' }} />
                <a
                  href="tel:+573218826730"
                  className="hover:text-white transition-colors"
                >
                  +57 321 882 6730
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="flex-shrink-0" style={{ color: '#E8B92F' }} />
                <a
                  href="mailto:sufincaraiz.comercial@gmail.com"
                  className="hover:text-white transition-colors break-all"
                >
                  sufincaraiz.comercial@gmail.com
                </a>
              </div>
            </address>

            {/* Redes sociales reales */}
            <div className="flex gap-3 pt-1">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Propiedades */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              Propiedades
            </h3>
            <ul className="space-y-2 text-sm">
              {PROPERTY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* La empresa */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              La empresa
            </h3>
            <ul className="space-y-2 text-sm">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Municipios + mapa real */}
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              Municipios
            </h3>
            <ul className="space-y-2 text-sm mb-5">
              {MUNICIPIOS.map((m) => (
                <li key={m}>
                  <Link
                    href={`/municipios/${m
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[̀-ͯ]/g, '')
                      .replace(/ /g, '-')}`}
                    className="hover:text-white transition-colors"
                  >
                    {m}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Google Maps iframe real */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d19293.529590502436!2d-74.35020089149475!3d5.0005192790326305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e4085e963707b39%3A0xfeeb3f69fde3f246!2sSu%20Finca%20Ra%C3%ADz!5e1!3m2!1ses-419!2sco!4v1780780954655!5m2!1ses-419!2sco"
              width="100%"
              height="180"
              style={{ border: 0, borderRadius: 8 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Su Finca Raíz en Google Maps"
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}
        >
          <p>© {new Date().getFullYear()} Su Finca Raíz. Todos los derechos reservados.</p>
          <ul className="flex gap-4">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white/80 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
