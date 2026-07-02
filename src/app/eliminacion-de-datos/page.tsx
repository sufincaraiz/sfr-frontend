import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Eliminación de Datos Personales | Su Finca Raíz',
  description:
    'Cómo solicitar la eliminación de tus datos personales en Su Finca Raíz, conforme a la ' +
    'Ley 1581 de 2012 de Colombia y a las políticas de Meta (WhatsApp).',
  alternates: { canonical: `${SITE_URL}/eliminacion-de-datos` },
  robots: { index: true, follow: true },
};

// Estilo de lista ordenada consistente con .legal-prose ul (que usa flex + marker)
const olStyle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  paddingLeft: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.55rem',
};

export default function EliminacionDatosPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Eliminación de Datos', href: '/eliminacion-de-datos' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <LegalLayout
        title="Eliminación de Datos Personales"
        updated="1 de julio de 2026"
        breadcrumbLabel="Eliminación de Datos"
      >
        <p className="intro">
          En Su Finca Raíz respetamos tu derecho a la privacidad y al control de tu información
          personal, conforme a la Ley 1581 de 2012 de Colombia y a las políticas de Meta.
        </p>

        <h2>Qué datos almacenamos</h2>
        <p>
          Cuando interactúas con nosotros a través de nuestro sitio web, formularios o nuestro
          asistente virtual por WhatsApp (Mac), podemos almacenar datos como tu nombre, número de
          teléfono, correo electrónico y el contenido de tu conversación, con el fin de atender tu
          solicitud inmobiliaria.
        </p>

        <h2>Cómo solicitar la eliminación de tus datos</h2>
        <p>
          Si deseas que eliminemos toda la información personal que tenemos sobre ti, puedes
          solicitarlo de forma gratuita siguiendo estos pasos:
        </p>
        <ol style={olStyle}>
          <li>
            Envía un correo electrónico a{' '}
            <a href="mailto:sufincaraiz.comercial@gmail.com?subject=Eliminación%20de%20datos">
              sufincaraiz.comercial@gmail.com
            </a>{' '}
            con el asunto &ldquo;Eliminación de datos&rdquo;.
          </li>
          <li>
            Indica en el mensaje el nombre y el número de teléfono o correo con el que nos
            contactaste, para poder identificar tus datos.
          </li>
          <li>
            Recibirás una confirmación y procesaremos tu solicitud en un plazo máximo de 15 días
            hábiles.
          </li>
        </ol>

        <h2>Qué se elimina</h2>
        <p>
          Se eliminará toda la información personal asociada a ti en nuestros sistemas: datos de
          contacto, historial de conversaciones con nuestro asistente virtual y registros en nuestra
          base de datos, salvo aquella información que la ley nos obligue a conservar.
        </p>

        <h2>Contacto</h2>
        <p>
          Para cualquier duda sobre el tratamiento de tus datos personales, escríbenos a{' '}
          <a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a> o
          visita nuestra oficina en Calle 21 #2-18, Calle Los Naranjos, La Vega, Cundinamarca.
        </p>
      </LegalLayout>
    </>
  );
}
