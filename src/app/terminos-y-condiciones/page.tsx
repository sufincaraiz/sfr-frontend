import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Términos y Condiciones de Uso | Su Finca Raíz',
  description:
    'Términos y condiciones de uso del portal sufincaraiz.com: objeto, propiedad ' +
    'intelectual, uso del Agente IA Mac, exención de responsabilidad y jurisdicción.',
  alternates: { canonical: `${SITE_URL}/terminos-y-condiciones` },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Términos y Condiciones', href: '/terminos-y-condiciones' },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <LegalLayout
        title="Términos y Condiciones de Uso"
        updated="12 de junio de 2026"
        breadcrumbLabel="Términos y Condiciones"
      >
        <h2>1. Aceptación de los Términos</h2>
        <p>
          El acceso y uso del portal web sufincaraiz.com atribuye la condición de usuario e
          implica la aceptación plena y sin reservas de todas las disposiciones incluidas en
          estos Términos y Condiciones. Si el usuario no está de acuerdo con alguna de las
          condiciones, deberá abstenerse de utilizar la plataforma.
        </p>

        <h2>2. Objeto del Portal</h2>
        <p>
          sufincaraiz.com es una plataforma digital que funciona como un Centro de Negocios
          Inmobiliarios, dedicado a la promoción, intermediación, publicidad y asesoría integral
          de propiedades (lotes, fincas, casas campestres y condominios) con foco en La Vega y el
          departamento de Cundinamarca.
        </p>

        <h2>3. Propiedad Intelectual y Derechos de Autor</h2>
        <p>
          Todo el contenido alojado en este sitio web —incluyendo pero no limitándose a
          fotografías, recorridos virtuales 360°, tomas aéreas con drones, renders inmersivos,
          textos descriptivos, logotipos, código fuente y diseño de interfaz— es propiedad
          exclusiva de Su Finca Raíz o cuenta con las debidas licencias y autorizaciones. Queda
          estrictamente prohibida la reproducción, distribución, modificación o explotación
          comercial de este material sin autorización previa y por escrito.
        </p>

        <h2>4. Interacción con Inteligencia Artificial (Agente Inmobiliario Mac)</h2>
        <p>
          Para mejorar la experiencia del usuario, la plataforma dispone de un asistente virtual
          impulsado por Inteligencia Artificial denominado &ldquo;Agente Inmobiliario Mac&rdquo;.
        </p>
        <ul>
          <li><strong>Carácter informativo:</strong> Toda la información, sugerencias o respuestas generadas por el Agente Mac son de carácter preliminar y orientativo.</li>
          <li><strong>Sin efecto vinculante:</strong> Ninguna conversación, cotización o afirmación emitida por el Agente Mac constituye una oferta mercantil formal, un contrato vinculante, ni una promesa de compraventa.</li>
          <li><strong>Validación obligatoria:</strong> El cierre de cualquier negocio, la confirmación de precios, el saneamiento de títulos y la firma de documentos legales requerirán siempre la intervención, validación y acompañamiento directo del equipo humano y directivo de Su Finca Raíz.</li>
        </ul>

        <h2>5. Exención de Responsabilidad</h2>
        <p>
          Su Finca Raíz realiza esfuerzos exhaustivos para garantizar que la información de áreas,
          linderos y precios sea precisa y actualizada. Sin embargo, toda transacción final está
          sujeta a la validación física y jurídica de los títulos correspondientes. La entrega de
          la posesión material de cualquier inmueble se regirá única y exclusivamente por lo
          pactado en las promesas de compraventa formales.
        </p>

        <h2>6. Legislación y Jurisdicción</h2>
        <p>
          Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia
          derivada del uso de este portal será sometida a las autoridades competentes en la
          jurisdicción correspondiente a La Vega, Cundinamarca.
        </p>

        <h2>7. Contacto</h2>
        <p>
          Su Finca Raíz — Calle 21 #2-18, Calle Los Naranjos, La Vega, Cundinamarca. Correo:{' '}
          <a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a> —
          WhatsApp: <a href="https://wa.me/573218826730">+57 321 882 6730</a>.
        </p>
      </LegalLayout>
    </>
  );
}
