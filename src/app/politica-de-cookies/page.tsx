import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Cookies',
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
        updated="19 de octubre de 2026"
        breadcrumbLabel="Política de Cookies"
      >
        <p className="intro">
          En sufincaraiz.com usamos <strong>muy pocas cookies</strong>: las estrictamente necesarias
          para mantener abierta una sesión cuando alguien entra con clave, y las que colocan por su
          cuenta los servicios externos que incrustamos —mapas, recorridos 360° y vídeos—. No
          usamos cookies de publicidad, de seguimiento ni de analítica.
        </p>

        <h2>1. ¿Qué son las Cookies?</h2>
        <p>
          Son pequeños archivos de texto que un sitio puede guardar en el navegador de tu
          dispositivo (computador o celular). Sirven, en general, para recordar entre una página y
          otra quién eres o qué elegiste. En este sitio solo se usan para lo del numeral
          siguiente: mantener abierta una sesión con clave.
        </p>

        <h2>2. ¿Qué tipos de Cookies utilizamos?</h2>
        <ul>
          <li>
            <strong>Cookies propias, estrictamente necesarias:</strong> una sola finalidad, mantener
            la sesión de quien <strong>entra con usuario y clave</strong> —el panel administrativo,
            el acceso de quien escribe en el blog de la comunidad y el enlace privado con PIN que se
            comparte con el propietario de un inmueble—. Se borran al cerrar sesión o al
            caducar.{' '}
            <strong>
              Navegar por el sitio, usar el buscador de inmuebles y escribirle al Agente Mac no
              requieren ninguna cookie
            </strong>{' '}
            y no colocan ninguna.
          </li>
          <li>
            <strong>Cookies de terceros, por el contenido incrustado:</strong> cuando una página
            carga un mapa de Google, un recorrido 360° o un vídeo de YouTube o TikTok, esos
            servicios pueden colocar sus propias cookies desde sus dominios. No las controlamos ni
            accedemos a ellas; se rigen por las políticas de cada proveedor.
          </li>
          <li>
            <strong>Lo que NO usamos:</strong> no hay cookies de publicidad, de perfilado ni de
            analítica. En particular,{' '}
            <strong>este sitio no tiene instalado Google Analytics</strong> ni ninguna otra
            herramienta de medición de tráfico basada en cookies.
          </li>
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
