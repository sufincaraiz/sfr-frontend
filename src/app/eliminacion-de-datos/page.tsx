import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Eliminación de Datos Personales',
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
        updated="19 de octubre de 2026"
        breadcrumbLabel="Eliminación de Datos"
      >
        <p className="intro">
          En Su Finca Raíz respetamos tu derecho a la privacidad y al control de tu información
          personal, conforme a la Ley 1581 de 2012 de Colombia y a las políticas de Meta.
        </p>

        <h2>Qué datos almacenamos</h2>
        <p>
          Cuando interactúas con nosotros a través de nuestro sitio web, formularios o nuestro
          asistente virtual Mac (en el sitio web o por WhatsApp), podemos almacenar datos como tu nombre, número de
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
            Recibirás <strong>acuse de recibo</strong> y resolveremos tu solicitud en un plazo
            máximo de <strong>quince (15) días hábiles</strong>, que es el plazo del artículo 15 de
            la Ley 1581 de 2012.
          </li>
          <li>
            Al terminar recibirás una <strong>constancia escrita</strong> que indica la fecha en que
            se ejecutó y <strong>en qué registros se buscó</strong> —solicitudes de contacto,
            conversaciones con el agente Mac y registros de visita a inmuebles—. Guárdala: es el
            comprobante de que la solicitud se cumplió.
          </li>
        </ol>

        <h2>Qué se elimina, y cómo</h2>
        <p>
          Se eliminan tus <strong>datos de contacto</strong> (nombre, teléfono, correo), el{' '}
          <strong>texto de tus conversaciones</strong> con el asistente virtual y tus{' '}
          <strong>registros de visita a inmuebles</strong>, salvo aquella información que la ley nos
          obligue a conservar —en particular los soportes contables de una operación ya realizada,
          que se conservan diez (10) años por el artículo 28 de la Ley 962 de 2005—.
        </p>
        <p>
          La búsqueda y el borrado los hace <strong>una persona</strong>, registro por registro: Su
          Finca Raíz es una empresa pequeña y no tiene un proceso automatizado para esto. Eso no
          cambia el plazo ni el resultado, y es la razón por la que te pedimos el dato con el que nos
          contactaste: sin él no podemos encontrarte. Si una búsqueda no encuentra nada a tu nombre,
          la constancia también lo dice.
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
