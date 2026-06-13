import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Cookies | Su Finca Raíz',
  description:
    'Política de cookies de sufincaraiz.com: qué son, qué tipos usamos (necesarias, ' +
    'rendimiento, funcionalidad y multimedia) y cómo afectan tu navegación.',
  alternates: { canonical: `${SITE_URL}/politica-de-cookies` },
  robots: { index: true, follow: true },
};

export default function PoliticaCookiesPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Política de Cookies', href: '/politica-de-cookies' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <LegalLayout
        title="Política de Cookies"
        updated="12 de junio de 2026"
        breadcrumbLabel="Política de Cookies"
      >
        <p className="intro">
          En sufincaraiz.com utilizamos cookies propias y de terceros para garantizar el correcto
          funcionamiento del portal, ofrecerte recorridos inmersivos y analizar el tráfico de
          nuestra web.
        </p>

        <h2>1. ¿Qué son las Cookies?</h2>
        <p>
          Son pequeños archivos de texto que se descargan y almacenan en el navegador de tu
          dispositivo (computador o celular) cuando visitas nuestra página, permitiendo recordar
          tus preferencias de búsqueda y comportamiento.
        </p>

        <h2>2. ¿Qué tipos de Cookies utilizamos?</h2>
        <ul>
          <li><strong>Cookies Estrictamente Necesarias:</strong> Son esenciales para que puedas navegar por la página, usar el buscador de inmuebles y comunicarte con el Agente Mac. Sin estas cookies, la plataforma no funcionaría correctamente.</li>
          <li><strong>Cookies de Rendimiento y Análisis:</strong> Nos ayudan a entender cómo interactúan los visitantes con la web (qué fincas visitan más, de dónde provienen), utilizando herramientas como Google Analytics para mejorar nuestra oferta.</li>
          <li><strong>Cookies de Funcionalidad y Multimedia:</strong> Son necesarias para cargar de manera eficiente los recorridos 360°, mapas interactivos y videos incrustados de plataformas como YouTube o TikTok.</li>
        </ul>

        <h2>3. Contacto</h2>
        <p>
          Para dudas sobre esta política:{' '}
          <a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a> —{' '}
          <a href="https://wa.me/573218826730">+57 321 882 6730</a>.
        </p>
      </LegalLayout>
    </>
  );
}
