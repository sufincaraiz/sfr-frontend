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

        <h2>7. Políticas de Contenido Generado por el Usuario (Blog y Comunidad)</h2>
        <p>
          Estas cláusulas aplican a cualquier artículo, mensaje, imagen u otro material que un usuario
          publique en el blog y la comunidad de Su Finca Raíz.
        </p>
        <p>
          <strong>Licencia de Uso:</strong> Al publicar un artículo, el usuario conserva los derechos
          de autor sobre su obra, pero otorga a Su Finca Raíz una licencia gratuita, perpetua y no
          exclusiva para exhibir, modificar (por corrección de estilo o SEO) y compartir el contenido
          en sus redes sociales y canales aliados.
        </p>
        <p>
          <strong>Enfoque Comunitario y Contenido Prohibido:</strong> El objetivo fundamental del blog
          y la comunidad de Su Finca Raíz es trascender el conocimiento, aportando valor educativo
          sobre el sector inmobiliario, la inversión y el desarrollo en la región. Para proteger este
          propósito constructivo, queda estrictamente prohibido utilizar la plataforma para publicar:
        </p>
        <ul>
          <li><strong>Proselitismo y Politiquería:</strong> Cualquier contenido destinado a promover campañas políticas, debates partidistas o proselitismo de cualquier índole.</li>
          <li><strong>Discursos de Odio y Discriminación:</strong> Textos que ataquen, denigren o promuevan la intolerancia hacia cualquier persona o grupo por motivos de género, raza, religión, orientación sexual o ideología.</li>
          <li><strong>Crítica Destructiva:</strong> Artículos diseñados para difamar, atacar posturas ajenas o generar polémica innecesaria.</li>
          <li><strong>Spam Comercial:</strong> Anuncios clasificados de venta directa de inmuebles (los cuales deben gestionarse a través del Centro de Negocios).</li>
        </ul>
        <p>
          Todo contenido debe mantener un tono respetuoso, profesional y estrictamente orientado al
          aprendizaje mutuo. Su Finca Raíz se reserva el derecho de eliminar inmediatamente cualquier
          publicación que altere la convivencia y el propósito educativo de la plataforma.
        </p>
        <p>
          <strong>Derecho de Admisión y Moderación:</strong> Su Finca Raíz se reserva el derecho
          unilateral e inapelable de rechazar, editar, suspender o eliminar cualquier artículo o cuenta
          de usuario que incumpla estas políticas o que no se alinee con los estándares de calidad del
          Centro de Negocios, sin necesidad de previo aviso ni justificación.
        </p>
        <p>
          <strong>Cláusula de Indemnidad:</strong> El usuario se compromete a defender y mantener
          indemne a Su Finca Raíz y a su equipo directivo frente a cualquier demanda, multa o gasto
          legal que surja como consecuencia del contenido que haya subido a la plataforma.
        </p>

        <h2>8. Contacto</h2>
        <p>
          Su Finca Raíz — Calle 21 #2-18, Calle Los Naranjos, La Vega, Cundinamarca. Correo:{' '}
          <a href="mailto:sufincaraiz.comercial@gmail.com">sufincaraiz.comercial@gmail.com</a> —
          WhatsApp: <a href="https://wa.me/573218826730">+57 321 882 6730</a>.
        </p>
      </LegalLayout>
    </>
  );
}
