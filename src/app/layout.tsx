import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import { DATOS_OFICIALES } from '@/lib/datos-oficiales';
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
    // Sin cifra de inventario: este es el respaldo GLOBAL, lo heredan las páginas
    // que no definen la suya, y no puede afirmar un conteo que envejece en cada
    // publicación. La cifra real, en presente y derivada, va en la portada.
    // «a una hora de Bogotá» se quedó corto: la medición del 19/08/2026 da 74
    // minutos desde Portal 80. Ver lib/medicion-distancia.ts.
    'Compra fincas, lotes, casas y apartamentos verificados en La Vega, Cundinamarca, ' +
    'Asesoría profesional en finca raíz rural y urbana: ☎ 321 882 6730.',

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
      // «La Vega y el Gualivá a solo 2 horas» es falso para la provincia:
      // Vergara está a 130 minutos. El dato se ata al municipio del que es cierto.
      'Fincas, lotes y casas campestres verificados en La Vega, a una hora de ' +
      'Bogotá, y en los doce municipios de la Provincia del Gualivá.',
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
      'Fincas, lotes y casas campestres verificados en La Vega y el Gualivá, Cundinamarca.',
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
    shortcut: '/favicon.ico',
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
        {/* Coordenadas desde la fuente única: son las de la ficha de Google
            Business Profile, que es la que Google usa para resolver la entidad. */}
        <meta name="geo.position"    content={`${DATOS_OFICIALES.geoLat};${DATOS_OFICIALES.geoLng}`} />
        <meta name="ICBM"            content={`${DATOS_OFICIALES.geoLat}, ${DATOS_OFICIALES.geoLng}`} />
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
