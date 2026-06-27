import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { CustomCursor } from '@/components/layout/CustomCursor';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { MacChatWidgetLoader } from '@/components/mac/MacChatWidgetLoader';
import { SITE_URL } from '@/lib/site';

const montserrat = Montserrat({
  subsets: ['latin'],
  // Solo los 3 pesos realmente usados: body, headings, hero H2 (weight:900)
  // Elimina 500 y 600 — el browser redondea al más cercano (700) sin diferencia visual
  weight: ['400', '700', '900'],
  variable: '--font-montserrat',
  display: 'swap',  // evita FOIT (flash de texto invisible)
  preload: true,
});

// ─── Metadata global (heredada por todas las páginas) ─────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  // Template: cada página sobreescribe el segmento antes del pipe
  title: {
    default: 'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
    template: '%s | Su Finca Raíz',
  },

  description:
    'Compra fincas, lotes y casas campestres en La Vega, Cundinamarca. ' +
    '+100 propiedades verificadas a 2 h de Bogotá. Asesórate gratis: ☎ 321 882 6730.',

  // ── Keywords (señal secundaria, útil para Bing/Yahoo) ───────────────────────
  keywords: [
    'fincas en venta La Vega Cundinamarca',
    'fincas en venta cerca de Bogotá',
    'lotes en venta La Vega',
    'casas campestres Cundinamarca',
    'condominios campestres Gualivá',
    'fincas en venta Sasaima',
    'fincas en venta Nocaima',
    'fincas en venta Villeta',
    'inmobiliaria La Vega Cundinamarca',
    'comprar finca Colombia',
    'finca raíz rural Cundinamarca',
    'Su Finca Raíz',
  ],

  // ── Open Graph — Facebook, WhatsApp, LinkedIn ───────────────────────────────
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'Su Finca Raíz',
    url: SITE_URL,
    title: 'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
    description:
      'Fincas, lotes y casas campestres en La Vega y el Gualivá. ' +
      '+100 propiedades verificadas a solo 2 horas de Bogotá.',
    images: [
      {
        url: '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
        width: 1200,
        height: 630,
        alt: 'Fincas en venta en La Vega, Cundinamarca — Su Finca Raíz',
        type: 'image/jpeg',
      },
    ],
  },

  // ── Twitter / X Card ────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
    description:
      'Fincas, lotes y casas campestres en La Vega y el Gualivá, Cundinamarca. ' +
      '+100 propiedades verificadas.',
    images: ['/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg'],
  },

  // ── Robots ──────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },

  // ── Verificación de propiedad (Google Search Console + Meta/Facebook) ───────
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION ?? '',
    other: {
      // Verificación de dominio de Meta/Facebook (renderizada server-side en <head>)
      'facebook-domain-verification': '68dt356kb74alxbx0k805ybssnlijf',
    },
  },

  // ── Idioma y región ─────────────────────────────────────────────────────────
  // canonical se omite aquí: cada página declara el suyo (auto-referencial).
  // languages/hreflang se omite: sitio mono-idioma; ponerlo globalmente haría
  // que todas las páginas internas apunten su hreflang a la home.
  alternates: {},

  // ── App / PWA ────────────────────────────────────────────────────────────────
  applicationName: 'Su Finca Raíz',
  category: 'real estate',
  creator: 'Su Finca Raíz',
  publisher: 'Su Finca Raíz',

  // ── Favicon / ícono de pestaña ──────────────────────────────────────────────
  icons: {
    icon:     '/icon.png',
    shortcut: '/icon.png',
    apple:    '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={montserrat.variable}>
      <head>
        {/* Geo tags para SEO local */}
        <meta name="geo.region"      content="CO-CUN" />
        <meta name="geo.placename"   content="La Vega, Cundinamarca, Colombia" />
        <meta name="geo.position"    content="4.9929;-74.3404" />
        <meta name="ICBM"            content="4.9929, -74.3404" />
        {/* WhatsApp Business — número de teléfono */}
        <meta name="business:contact_data:phone_number" content="+573218826730" />
        <meta name="business:contact_data:website"      content={SITE_URL} />
        <meta name="business:contact_data:country_name" content="Colombia" />
      </head>
      <body className="font-sans">
        <CustomCursor />
        <PublicChrome><Header /></PublicChrome>
        <main id="main-content">{children}</main>
        <PublicChrome>
          <Footer />
          <WhatsAppFloat />
        </PublicChrome>
        <MacChatWidgetLoader />
      </body>
    </html>
  );
}
