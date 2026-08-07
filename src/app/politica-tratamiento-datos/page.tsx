import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos Personales',
  description:
    'Política de tratamiento y protección de datos personales de Su Finca Raíz en ' +
    'cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 (Habeas Data, Colombia).',
  alternates: { canonical: `${SITE_URL}/politica-tratamiento-datos` },
  robots: { index: true, follow: true },
};

export default function PoliticaDatosPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Política de Tratamiento de Datos', href: '/politica-tratamiento-datos' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <LegalLayout
        title="Política de Tratamiento de Datos Personales"
        updated="7 de agosto de 2026"
        breadcrumbLabel="Política de Datos"
      >
        <p className="intro">
          En cumplimiento estricto de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la
          República de Colombia, Su Finca Raíz establece la siguiente política para el tratamiento
          y protección de los datos personales de sus usuarios, clientes y aliados.
        </p>

        <h2>1. Finalidad del Tratamiento</h2>
        <p>
          Los datos personales recolectados a través de nuestros formularios web, WhatsApp, redes
          sociales o mediante la interacción con nuestro Agente IA, serán utilizados para:
        </p>
        <ul>
          <li>Atender solicitudes de venta, compra, arriendo o asesoría inmobiliaria.</li>
          <li>Compartir información sobre nuevos proyectos, lotes, condominios y oportunidades de inversión en la región.</li>
          <li>Formalizar procesos legales, redacción de contratos y promesas de compraventa.</li>
          <li>Mejorar la experiencia de navegación y entrenar nuestros modelos de atención al cliente.</li>
          <li>
            Control de ingreso y seguridad en las visitas a inmuebles: registrar la identidad de
            las personas que visitan propiedades gestionadas por Su Finca Raíz, con fines de
            seguridad y trazabilidad, incluyendo la posibilidad de compartir el nombre y número
            de documento del visitante con el propietario del inmueble visitado.
          </li>
        </ul>

        <h2>2. Tratamiento de Datos por Inteligencia Artificial</h2>
        <p>
          Al interactuar con el &ldquo;Agente Inmobiliario Mac&rdquo; (ya sea vía chat de texto o
          voz), el usuario acepta que el contenido de sus consultas sea procesado y almacenado
          temporalmente con el único fin de dar respuesta a su solicitud y optimizar el sistema. Se
          prohíbe expresamente a los usuarios suministrar información financiera, contraseñas o
          datos sensibles a través del chat automatizado.
        </p>

        <h2>3. Registro de Visitas a Inmuebles</h2>
        <p>
          Antes de ingresar a un inmueble gestionado por Su Finca Raíz, el visitante debe
          diligenciar un formulario de registro. Para esta finalidad se recolectan de forma
          expresa los siguientes datos: <strong>nombres y apellidos completos, número de
          documento de identidad (cédula)</strong>, inmueble que va a visitar, correo
          electrónico, número de celular y municipio de procedencia.
        </p>
        <p>
          La recolección del <strong>número de documento</strong> es necesaria para acreditar la
          identidad de quien ingresa a la propiedad y dejar trazabilidad de la visita, tanto en
          interés del propietario como del propio visitante.
        </p>
        <p>Sobre la circulación de estos datos:</p>
        <ul>
          <li>
            <strong>Nombre y número de documento:</strong> pueden ser compartidos con el
            propietario del inmueble visitado, quien tiene un interés legítimo en conocer quién
            ingresa a su propiedad.
          </li>
          <li>
            <strong>Correo electrónico y número de celular:</strong> son de uso interno de Su
            Finca Raíz. No se comparten con el propietario ni con terceros, y se utilizan
            únicamente para contactar al visitante en relación con su visita.
          </li>
        </ul>
        <p>
          Este tratamiento solo se realiza con la autorización previa y expresa del titular, que
          se recoge mediante casillas de aceptación en el formulario de registro. El visitante
          conserva en todo momento los derechos descritos en el numeral 4.
        </p>

        <h2>4. Derechos de los Titulares (Habeas Data)</h2>
        <p>Como titular de la información, usted tiene derecho a:</p>
        <ul>
          <li>Conocer, actualizar y rectificar sus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada a Su Finca Raíz.</li>
          <li>Ser informado sobre el uso que se le ha dado a sus datos.</li>
          <li>Revocar la autorización o solicitar la supresión de sus datos cuando lo considere pertinente.</li>
        </ul>

        <h2>5. Canales de Atención</h2>
        <p>
          Para ejercer sus derechos, puede enviar una solicitud formal a través de los siguientes
          medios:
        </p>
        <ul>
          <li><strong>Dirección:</strong> Calle 21 #2-18, Calle Los Naranjos, La Vega, Cundinamarca.</li>
          <li><strong>Correo Electrónico:</strong> <a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a></li>
          <li><strong>Teléfono / WhatsApp:</strong> <a href="https://wa.me/573218826730">+57 321 882 6730</a></li>
        </ul>
      </LegalLayout>
    </>
  );
}
