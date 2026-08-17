import { SITE_URL } from '@/lib/site';
import { MUNICIPIOS_PROVINCIA, DATOS_OFICIALES } from '@/lib/datos-oficiales';
import { HORARIO_SEDE } from '@/lib/horario';

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data, null, 0) }}
    />
  );
}

/**
 * Opciones de la entidad. Hoy solo el rango de precios, que se deriva del
 * catálogo (ver `rangoPreciosCatalogo`) en vez de escribirse a mano.
 */
interface EntidadOpts {
  /** Rango del catálogo activo. Si falta, el campo se OMITE: ver nota abajo. */
  priceRange?: string | null;
  /**
   * Tipos de inmueble con inventario activo, en plural («Fincas», «Lotes»).
   * De aquí sale `hasOfferCatalog`: el catálogo de servicios se DERIVA del
   * inventario en vez de mantenerse a mano, igual que las tres listas de
   * municipios de §1.3. Si falta, no se emite el campo.
   */
  tiposConInventario?: { slug: string; plural: string }[] | null;
}

// ── Logo ──────────────────────────────────────────────────────────────────────
// El archivo original mide 5526×1612. El marcado declaraba 200×200 en la entidad
// y 200×60 en el BlogPosting: dos tamaños distintos para el mismo archivo, y
// ninguno cierto. El 200×200 además decía que un logo apaisado es cuadrado, que
// es justo lo que Google usa para recortar la miniatura.
//
// Se sirve una versión reducida al mismo ratio (600×175, 36 KB) en vez del
// original de 5526 px: un logo de marcado no necesita esa resolución y el peso
// se paga en cada rastreo.
const LOGO = {
  url:    `${SITE_URL}/images/logo-su-finca-raiz-marcado.png`,
  width:  600,
  height: 175,
} as const;

// ── Nodo de entidad: RealEstateAgent / LocalBusiness ──────────────────────────
// Vive aparte de localBusinessSchema porque /nosotros necesita la entidad pero
// no el nodo WebSite: repetir WebSite en cada página no aporta nada.
/**
 * «fincas, casas campestres, lotes y apartamentos» a partir del inventario.
 *
 * Cae a una fórmula genérica si no llega la lista: prefiere decir menos antes
 * que nombrar un tipo que hoy no tiene ni una propiedad.
 */
function listaTipos(opts: EntidadOpts): string {
  const l = (opts.tiposConInventario ?? []).map(t => t.plural.toLowerCase())
  if (l.length === 0) return 'inmuebles rurales'
  const ultimo = l[l.length - 1]!
  if (l.length === 1) return ultimo
  return `${l.slice(0, -1).join(', ')} y ${ultimo}`
}

function organizationNode(opts: EntidadOpts = {}) {
  return {
    '@type': ['RealEstateAgent', 'LocalBusiness'],
    '@id': `${SITE_URL}/#organization`,

    name: 'Su Finca Raíz',
    // El alternateName lleva anclaje geográfico a propósito: es la forma que
    // un modelo puede usar para distinguir esta entidad de la inmobiliaria
    // homónima del Oriente Antioqueño (Rionegro, sufincaraiz.co).
    // Riesgo CONFIRMADO, no teórico: sufincaraiz.co (Rionegro, Oriente
    // Antioqueño) aparece en la misma página de resultados de Google bajo la
    // consulta «Su Finca Raíz», justo debajo de este sitio.
    alternateName: [
      'Su Finca Raíz La Vega',
      'Su Finca Raíz — La Vega',
      'Inmobiliaria Su Finca Raíz La Vega',
    ],

    // ── Identificador registral ──────────────────────────────────────────
    // La matrícula mercantil es el desambiguador más fuerte disponible: es
    // un número único de registro público que la otra empresa no comparte.
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'Matrícula Mercantil (Cámara de Comercio, Colombia)',
      value: '199483',
    },
    foundingDate: String(DATOS_OFICIALES.anioFundacion),

    // Sin «la primera»: era una afirmación de primicia sin forma de sustentarse,
    // del mismo terreno de la Ley 1480 que el «98 %» retirado. La versión actual
    // describe qué es la empresa en vez de afirmar que llegó antes que nadie.
    slogan: 'Inmobiliaria impulsada por inteligencia artificial en La Vega y el Gualivá',
    // La descripción ABRE con el anclaje geográfico y la matrícula: son las
    // dos primeras cosas que lee un modelo al resolver la entidad, y las que
    // la separan de la homónima antioqueña.
    // Abre con la categoría de entidad confirmada, seguida del anclaje
    // geográfico y la matrícula. La categoría es vocabulario de ENTIDAD (§4):
    // su sitio es este campo, knowsAbout y llms.txt, nunca un <title> ni un H1,
    // que siguen capturando «fincas en venta La Vega».
    description:
      `Centro de negocios inmobiliarios impulsado por inteligencia artificial en ` +
      `La Vega, Cundinamarca (Provincia del Gualivá, Colombia), ` +
      `con matrícula mercantil 199483 y operación desde ${DATOS_OFICIALES.anioFundacion}. ` +
      // La lista de tipos se DERIVA del inventario, igual que hasOfferCatalog.
      // Decía «fincas, lotes campestres, casas de descanso y condominios»: dos
      // de esos cuatro no existen como tipo —«condominio» se retiró y pasó a ser
      // el atributo en_condominio, y «lote campestre» tiene cero propiedades—.
      // Es el campo description de la entidad, que es lo que un modelo cita al
      // describir la empresa.
      `Su Finca Raíz comercializa ${listaTipos(opts)} en los doce municipios de la ` +
      'provincia, en finca raíz rural y urbana. Acompaña la debida ' +
      // Ni «incluye» ni «verificación»: lo primero promete gasto y lo segundo un
      // estado del mundo. Se declara lo que sí se hace y se puede comprobar
      // —orientar y estar presente—, que además es lo que ninguna otra
      // inmobiliaria de la región ofrece.
      'diligencia inmobiliaria —títulos, uso del suelo, acceso ' +
      // Versión FALSABLE de la capacidad de IA: cualquiera puede abrir el sitio
      // o WhatsApp a las tres de la mañana y comprobarla. «Inmobiliaria
      // inteligente» no se puede comprobar ni desmentir, y lo que no se puede
      // desmentir tampoco sirve de prueba.
      'y agua— orientando al comprador sobre qué revisar antes de firmar, y acompaña ' +
      'hasta la notaría. Opera Mac, un agente de inteligencia artificial ' +
      'propio disponible en web y WhatsApp las 24 horas, además de recorridos ' +
      'virtuales 360° y fotografía aérea con dron, en consorcio con Conarc ' +
      '(construcción).',

    url:   SITE_URL,
    logo: { '@type': 'ImageObject', ...LOGO },
    image: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`,

    // ── Contacto ─────────────────────────────────────────────────────────
    telephone: '+573218826730',
    email:     'sufincaraiz.comercial@gmail.com',

    // ── Dirección física ─────────────────────────────────────────────────
    //
    // SIN postalCode a propósito. Decía 253051, que no corresponde: la zona
    // regional de La Vega es 2536, así que sus tres códigos postales empiezan
    // por ahí. Es un campo opcional, Google no lo usa para posicionamiento
    // local, y uno incorrecto es una inconsistencia de NAP —el mismo negocio
    // diciendo dos direcciones distintas— que sí cuesta. Ausente es mejor que
    // equivocado. Se añadirá cuando esté confirmado en 4-72.
    address: {
      '@type':          'PostalAddress',
      // Literal según §1, que declara este bloque inmutable: decía
      // «Calle 21 #2-18 Los Naranjos», sin la coma ni «Sector». Una variación
      // del NAP es el mismo negocio diciendo dos direcciones distintas.
      streetAddress:    'Calle 21 # 2-18, Sector Los Naranjos',
      addressLocality:  'La Vega',
      addressRegion:    'Cundinamarca',
      addressCountry:   'CO',
    },

    // ── Coordenadas GPS exactas — La Vega, Cundinamarca ──────────────────
    geo: {
      '@type':    'GeoCoordinates',
      // Las de la ficha de Google Business Profile, que es la que Google usa
      // para resolver la entidad. Las anteriores estaban 837 m al suroeste y
      // contradecían a Google: una discrepancia de ubicación entre lo que
      // dice el sitio y lo que dice la ficha debilita la resolución local.
      latitude:  DATOS_OFICIALES.geoLat,
      longitude: DATOS_OFICIALES.geoLng,
    },

    // ── Horario de atención ───────────────────────────────────────────────
    //
    // Confirmado contra Google Business Profile, que es la fuente que Google
    // contrasta. Lo que había —L-V 08:00-18:00 y sábado 09:00-14:00— no salía
    // de ninguna parte: ni de la ficha, ni de §1, ni de otra página del sitio.
    // Y el sitio llegó a declarar TRES horarios distintos a la vez: este, el de
    // /contacto (L-S 08:00-18:00) y el de la prosa de llms.txt y /mac («L-V y
    // sábados por la mañana»). Ninguno de los tres era el real.
    //
    // Este campo describe atención HUMANA en la sede. La disponibilidad de Mac
    // NO va aquí: declararla convertiría el agente en una persona en la Calle
    // 21 a las tres de la mañana. Va como atributo del servicio, en /mac y en
    // llms.txt.
    //
    // La sede abre los SIETE días. Lunes a jueves comparten horario y van
    // agrupados; viernes, sábado y domingo son distintos y van sueltos.
    //
    // Se genera desde HORARIO_SEDE, que es también de donde sale la prosa de
    // /contacto, llms.txt y /mac. Escribirlo a mano en cada sitio es lo que
    // produjo tres versiones contradictorias.
    openingHoursSpecification: HORARIO_SEDE.map(f => ({
      '@type':   'OpeningHoursSpecification',
      dayOfWeek: f.dias.length === 1 ? f.dias[0] : [...f.dias],
      opens:     f.opens,
      closes:    f.closes,
    })),

    // ── Zona de cobertura — los DOCE de la Provincia del Gualivá ─────────
    //
    // Se genera desde MUNICIPIOS_PROVINCIA, nunca a mano. La lista anterior
    // estaba escrita aquí y declaraba diez municipios, dos de los cuales NO
    // son del Gualivá: El Peñón (Provincia de Rionegro) y Guayabal de
    // Síquima (Magdalena Centro). A la vez omitía La Peña, Nimaima,
    // Quebradanegra y Albán, que sí lo son.
    //
    // Declarar cobertura donde no se opera y omitirla donde sí es doblemente
    // costoso: confunde la resolución de entidad y deja fuera las consultas
    // («inmobiliarias en Útica») que se querían capturar.
    //
    // Cada municipio lleva su jerarquía completa: un modelo que resuelve
    // «Villeta» necesita saber que es la de Cundinamarca, Colombia.
    areaServed: MUNICIPIOS_PROVINCIA.map(nombre => ({
      '@type': 'City',
      name:    nombre,
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name:    'Provincia del Gualivá, Cundinamarca',
        containedInPlace: { '@type': 'Country', name: 'Colombia' },
      },
    })),

    // ── Catálogo de servicios ─────────────────────────────────────────────
    //
    // Doctrina §1.1: un servicio solo se declara aquí si existe una página que
    // lo sustente. Los cuatro que quedan son corretaje, y el catálogo los
    // respalda uno por uno (condominio 11, casa 9, finca 8, lote 3 activos).
    //
    // Se retiró «Asesoría Integral en Compraventa», que prometía «avalúo
    // comercial, negociación, escrituración notarial, trámites de financiación
    // y entrega» sin ninguna página detrás. Dos problemas a la vez: un servicio
    // sin respaldo publicado, y la palabra «avalúo», que nombra una actividad
    // regulada por la Ley 1673 de 2013 y reservada a inscritos en el RAA.
    //
    // Los demás servicios reales —estudio de títulos, análisis comercial de
    // valor, consorcio con Conarc, proyectos para terceros, dron— siguen
    // mencionados en prosa en la description y en /nosotros, que es el nivel de
    // compromiso que §1.1 permite sin página. Vuelven aquí cuando tengan una.
    //
    // LA LISTA SE DERIVA DEL INVENTARIO, no se mantiene a mano. Era una lista
    // fija de cuatro tipos que omitía los apartamentos pese a haber tres
    // activos: la misma clase de desincronización que ya se corrigió con los
    // municipios en §1.3. Ahora un tipo entra al catálogo el día que entra su
    // primera propiedad y sale cuando se vende la última.
    //
    // Las descripciones se generan; no hay texto por tipo escrito a mano. La
    // que había para fincas prometía «desde 1 hasta 50 hectáreas» cuando el
    // predio más grande del catálogo tiene 1,9 ha. No se sustituye por el rango
    // real: el tamaño de los predios que se pueden intermediar no depende del
    // inventario de hoy, y declararlo convertiría un dato inflado en una
    // limitación autoimpuesta. El servicio se describe sin cifra de superficie.
    ...(opts.tiposConInventario?.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name:    'Servicios Inmobiliarios Su Finca Raíz',
            itemListElement: opts.tiposConInventario.map(tipo => ({
              '@type': 'Offer',
              itemOffered: {
                '@type':      'Service',
                name:         `Venta de ${tipo.plural} en La Vega y el Gualivá, Cundinamarca`,
                description:
                  `Intermediación en la compraventa de ${tipo.plural.toLowerCase()} en los ` +
                  'doce municipios de la Provincia del Gualivá, Cundinamarca, con acompañamiento ' +
                  'en el proceso y orientación sobre qué revisar en títulos, uso del suelo, acceso y agua.',
                provider:   { '@id': `${SITE_URL}/#organization` },
                areaServed: MUNICIPIOS_PROVINCIA.map(nombre => ({ '@type': 'City', name: nombre })),
              },
            })),
          },
        }
      : {}),

    // ── Rango de precios (señal de relevancia para búsquedas comerciales) ─
    //
    // Se deriva del catálogo activo. Antes decía «COP 50.000.000 – COP
    // 5.000.000.000», escrita a mano, mientras el catálogo real iba de 150 a
    // 2.200 millones: el techo declarado más que duplicaba a la propiedad más
    // cara que existe. Una cifra así no la desmiente nadie de inmediato, y por
    // eso es peor: contradice al resto del sitio en silencio.
    //
    // Si la base no responde el campo NO se emite. Un priceRange ausente es
    // una señal que falta; uno inventado es una señal que engaña.
    ...(opts.priceRange ? { priceRange: opts.priceRange } : {}),
    currenciesAccepted: 'COP',

    // ── Punto de contacto para ventas ─────────────────────────────────────
    //
    // El `areaServed` de ventas decía 'CO' —Colombia entera— mientras el resto
    // del marcado declara doce municipios. Un modelo que lee las dos cosas no
    // sabe cuál creer, y la más amplia es la que no se sostiene. Ahora sale de
    // MUNICIPIOS_PROVINCIA, la misma fuente que el areaServed de la entidad:
    // una sola lista, dos usos, imposible que diverjan.
    contactPoint: [
      {
        '@type':             'ContactPoint',
        telephone:           '+573218826730',
        contactType:         'sales',
        availableLanguage:   'Spanish',
        areaServed:          MUNICIPIOS_PROVINCIA.map(nombre => ({ '@type': 'City', name: nombre })),
      },
      {
        '@type':             'ContactPoint',
        telephone:           '+573218826730',
        contactType:         'customer-service',
        availableLanguage:   'Spanish',
        areaServed:          MUNICIPIOS_PROVINCIA.map(nombre => ({ '@type': 'City', name: nombre })),
      },
    ],

    // ── Perfiles en redes sociales (señal de autoridad de marca) ──────────
    // ── sameAs: «estos perfiles soy yo» ──────────────────────────────────
    // Es el campo más importante contra la fragmentación de identidad y
    // contra el homónimo antioqueño: le dice al modelo qué perfiles externos
    // pertenecen a ESTA entidad y no a la otra.
    //
    // TODO pendiente: perfil en Fincaraiz, y sitio de Conarc para el
    // enlazado cruzado del consorcio.
    sameAs: [
      // Ficha de Google Business Profile. Se usa la forma canónica por CID
      // (el identificador numérico del lugar) y NO el enlace corto
      // maps.app.goo.gl que se recibió: un acortador puede cambiar de destino
      // o caducar, mientras que el CID identifica el lugar de forma estable.
      'https://maps.google.com/?cid=18368845229624390214',
      'https://www.metrocuadrado.com/inmobiliaria/su-finca-raiz/11185',
      'https://www.instagram.com/sufincaraizlavega/',
      'https://www.facebook.com/inmobiliariasufincaraiz',
      'https://www.tiktok.com/@sufincaraiz',
      'https://www.youtube.com/@sufincaraiz_lavega',
    ],

    // ── Temáticas de expertise para E-E-A-T ──────────────────────────────
    // §4 v7.2: `knowsAbout` declara TEMAS de conocimiento, no servicios que se
    // prestan. Un artículo que explica financiación rural respalda conocimiento
    // sobre financiación rural aunque no exista una página de servicio. El
    // criterio estricto de §1.1 —página propia— gobierna `hasOfferCatalog`, no
    // este campo: un término solo se retira si NINGUNA página trata el tema.
    //
    // Por eso salió «realidad aumentada construcción», que no tenía ni servicio
    // ni contenido, y se quedan parcelación, escrituración y financiación, que
    // sí tienen artículos y secciones detrás.
    //
    // Los añadidos salen del contenido que ya existe y no estaba declarado: los
    // veinte términos del glosario, las doce páginas de vereda, las ocho de
    // municipio y los tres artículos del blog. Es conocimiento publicado que el
    // marcado no estaba reclamando.
    //
    // NO se añade «avalúo catastral» pese a estar en el glosario. Como tema de
    // conocimiento sería defendible, pero la palabra nombra una actividad
    // regulada (Ley 1673 de 2013) y en un campo de la entidad se lee como
    // capacidad ofrecida. El glosario puede explicarla; la entidad no debe
    // reclamarla.
    //
    // «Fotogrametría» sigue fuera hasta que se publique la página de dron: hoy
    // no hay ni un solo modelo 3D publicado que la respalde.
    knowsAbout: [
      'centro de negocios inmobiliarios impulsado por inteligencia artificial',
      'inteligencia artificial inmobiliaria',
      'fincas La Vega Cundinamarca',
      'inversión inmobiliaria Gualivá',
      'recorridos virtuales 360',
      'proyectos de parcelación',
      'Compraventa de fincas en Cundinamarca',
      'Lotes campestres en La Vega',
      'Casas de recreo cerca de Bogotá',
      'Condominios campestres Gualivá',
      'Valorización de finca raíz rural en Colombia',
      'Escrituración y trámites notariales en Colombia',
      'Financiación de inmuebles rurales',
      // ── Añadidos en la v7.2, cada uno con su respaldo publicado ──────────
      'Provincia del Gualivá, Cundinamarca',                    // 8 páginas de municipio
      'Veredas de La Vega, Cundinamarca',                       // 12 páginas de vereda
      'Uso del suelo y Plan de Ordenamiento Territorial (POT)', // glosario + guía
      'Certificado de tradición y libertad',                    // glosario
      'Folio de matrícula inmobiliaria',                        // glosario
      'Estudio de títulos de predios rurales',                  // glosario + guía
      'Promesa de compraventa y arras',                         // glosario
      'Impuesto de registro y derechos notariales en Colombia', // glosario
      'Catastro y valorización predial',                        // glosario
      'Plusvalía inmobiliaria',                                 // glosario
      // ── Urbano. El catálogo tiene apartamentos y el casco urbano de La Vega
      //    es mercado propio; declarar solo lo rural dejaba fuera media oferta.
      //    Se AÑADEN sin tocar los rurales: knowsAbout declara temas sobre los
      //    que se sabe (§4), no lo que se vende, y los rurales específicos son
      //    justo donde no hay competencia.
      'Compra de vivienda urbana en municipios de Cundinamarca', // catálogo + fichas
      'Mercado de apartamentos en La Vega',                      // 4 fichas + ruta limpia
      'Casco urbano de La Vega, Cundinamarca',                   // página de municipio
      'Proceso de compraventa de finca raíz rural en Colombia', // guía + blog
      'Historia de La Vega, Cundinamarca',                      // blog + páginas de municipio
      'Agente conversacional de IA aplicado a finca raíz',      // /mac
    ],
  };
}

// ── Organización + RealEstateAgent + WebSite (portada) ────────────────────────
export function localBusinessSchema(opts: EntidadOpts = {}) {
  return {
    '@context': 'https://schema.org',
    // @graph permite incluir múltiples entidades en un solo bloque JSON-LD
    '@graph': [

      organizationNode(opts),

      // ── WebSite con SearchAction (Sitelinks Searchbox en Google) ───────────
      {
        '@type': 'WebSite',
        '@id':   `${SITE_URL}/#website`,
        url:     SITE_URL,
        name:    'Su Finca Raíz',
        description:
          'Portal inmobiliario especializado en fincas, lotes y casas campestres ' +
          'en La Vega y el Gualivá, Cundinamarca, Colombia.',
        publisher:  { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'es-CO',
        // Habilita el cuadro de búsqueda interno en los resultados de Google
        potentialAction: {
          '@type':       'SearchAction',
          target:        `${SITE_URL}/propiedades?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },

    ],
  };
}

/**
 * La entidad sola, sin el nodo WebSite. Para `/nosotros`, que la doctrina §5
 * exige que lleve `RealEstateAgent` y hoy sale al aire solo con FAQ y migas.
 */
export function realEstateAgentSchema(opts: EntidadOpts = {}) {
  return {
    '@context': 'https://schema.org',
    ...organizationNode(opts),
  };
}

// ── Persona autora ────────────────────────────────────────────────────────────
/**
 * El autor real de los artículos. La doctrina §5 exige `author` como `Person`
 * y no como organización: un modelo atribuye conocimiento a personas, y una
 * empresa que se firma a sí misma no aporta ninguna señal de autoría.
 *
 * EL `@id` ES ESTABLE Y SE REFERENCIA DESDE `/nosotros`. Ese es el punto: la
 * misma persona aparece en cada `BlogPosting` y en la página de la empresa
 * apuntando al mismo identificador, así que las dos menciones se resuelven como
 * una sola entidad en vez de como dos nombres sueltos.
 *
 * TIENE QUE EXISTIR TAMBIÉN COMO BLOQUE VISIBLE. Va al pie de cada artículo y
 * en `/nosotros` (ver `<AutorArticulo>`). Una `Person` que solo vive en el
 * marcado y no aparece en ninguna página es marcado sin respaldo — exactamente
 * lo que §1.1 prohíbe para los servicios, y vale igual para las personas.
 *
 * Los datos son verificables y sin adjetivos: dirige la empresa desde su
 * fundación y tiene formación en ingeniería de sistemas. Nada de «reconocido
 * experto», que es lo que §3 llama un adjetivo en lugar de una afirmación
 * falsable.
 */
export const AUTOR_ID = `${SITE_URL}/#leonel-lopez`;

export function personaAutora() {
  return {
    '@type':   'Person',
    '@id':      AUTOR_ID,
    name:      'Leonel Macgiver López Albadán',
    jobTitle:  'Director',
    worksFor:  { '@id': `${SITE_URL}/#organization` },
    knowsAbout: [
      'Mercado inmobiliario de La Vega y la Provincia del Gualivá',
      'Uso del suelo y ordenamiento territorial en Cundinamarca',
      'Estudio de títulos de predios rurales',
    ],
    url: `${SITE_URL}/nosotros`,
  };
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
export function breadcrumbSchema(items: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type':    'ListItem',
      position:    i + 1,
      name:        item.name,
      item:       `${SITE_URL}${item.href}`,
    })),
  };
}

// ── ItemList (páginas de listado: catálogo, directorio) ──────────────────────
/**
 * Lista ordenada de elementos para una página de colección.
 *
 * `position` arranca en `desde`, no en 1, porque en un catálogo paginado la
 * segunda página contiene los elementos 13 al 24: reiniciar la numeración en
 * cada página le dice al motor que hay doce elementos repetidos doce veces.
 *
 * `numberOfItems` es el total de la colección, no el de esta página. Son cosas
 * distintas y schema.org distingue entre ellas a propósito.
 */
export function itemListSchema(params: {
  url:            string
  name:           string
  description?:   string
  /** Elementos de ESTA página, en el orden en que se muestran. */
  items: {
    name:  string
    /** URL propia del elemento, si la tiene. */
    url?:  string
    /** Nodo embebido, para colecciones cuyos elementos NO tienen página propia:
     *  el directorio es el caso: los negocios se listan pero no tienen ficha. Sin
     *  esto habría que inventarles una URL, y una URL inventada en el marcado es
     *  peor que no marcar nada. */
    item?: Record<string, unknown>
  }[]
  /** Total de la colección completa. Por defecto, el de esta página. */
  numberOfItems?: number
  /** Posición del primer elemento dentro de la colección. Base 1. */
  desde?:         number
  /** Criterio real de ordenación de la lista. El catálogo va por fecha
   *  descendente; el directorio, alfabético ascendente. */
  orden?:         'asc' | 'desc'
}) {
  const desde = params.desde ?? 1;

  return {
    '@context':     'https://schema.org',
    '@type':        'ItemList',
    '@id':          `${params.url}#itemlist`,
    url:             params.url,
    name:            params.name,
    ...(params.description ? { description: params.description } : {}),
    numberOfItems:   params.numberOfItems ?? params.items.length,
    itemListOrder:   params.orden === 'asc'
      ? 'https://schema.org/ItemListOrderAscending'
      : 'https://schema.org/ItemListOrderDescending',
    itemListElement: params.items.map((el, i) => ({
      '@type':  'ListItem',
      position:  desde + i,
      name:      el.name,
      ...(el.url  ? { url:  el.url }  : {}),
      ...(el.item ? { item: el.item } : {}),
    })),
  };
}

// ── Propiedad individual (página de detalle) ──────────────────────────────────
export function propertySchema(property: {
  title:         string;
  slug:          string;
  description:   string;
  price_cop:     number;
  status:        string;
  bedrooms:      number;
  bathrooms:     number;
  area_built_m2: number | null;
  area_lot_m2:   number | null;
  geo_lat:       number | null;
  geo_lng:       number | null;
  city:          string;
  images:        string[];
  published_at:  string;
  updated_at:    string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type':    'RealEstateListing',
    name:        property.title,
    url:        `${SITE_URL}/propiedad/${property.slug}`,
    description: property.description,
    datePosted:  property.published_at,
    dateModified: property.updated_at,
    image:       property.images,
    address: {
      '@type':          'PostalAddress',
      addressLocality:  property.city,
      addressRegion:    'Cundinamarca',
      addressCountry:   'CO',
    },
    ...(property.geo_lat && property.geo_lng
      ? { geo: { '@type': 'GeoCoordinates', latitude: property.geo_lat, longitude: property.geo_lng } }
      : {}),
    offers: {
      '@type':       'Offer',
      price:          property.price_cop,
      priceCurrency: 'COP',
      availability:
        property.status === 'available'
          ? 'https://schema.org/InStock'
          : property.status === 'reserved'
            ? 'https://schema.org/LimitedAvailability'
            : 'https://schema.org/SoldOut',
    },
    numberOfRooms:          property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    ...(property.area_built_m2
      ? { floorSize: { '@type': 'QuantitativeValue', value: property.area_built_m2, unitCode: 'MTK' } }
      : {}),
    ...(property.area_lot_m2
      ? { lotSize:   { '@type': 'QuantitativeValue', value: property.area_lot_m2,   unitCode: 'MTK' } }
      : {}),
    broker: { '@id': `${SITE_URL}/#organization` },
  };
}

// ── Article Schema (blog posts) ───────────────────────────────────────────────
export function articleSchema(article: {
  title:        string
  excerpt:      string
  slug:         string
  date:         string
  updated?:     string
  author?:      string
  cover_image?: string
  category_name: string
}) {
  const imageUrl = article.cover_image
    ? `${SITE_URL}${article.cover_image}`
    : `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`

  return {
    '@context':    'https://schema.org',
    '@type':       'BlogPosting',
    '@id':         `${SITE_URL}/blog/${article.slug}#article`,
    headline:       article.title,
    description:    article.excerpt,
    url:           `${SITE_URL}/blog/${article.slug}`,
    datePublished:  article.date,
    dateModified:   article.updated ?? article.date,
    image: [{ '@type': 'ImageObject', url: imageUrl, width: 1200, height: 630 }],
    // `author` es la Person; `publisher` sigue siendo la organización. Son
    // papeles distintos y confundirlos es lo que hacía este esquema, que
    // firmaba los artículos con el @id de la empresa.
    author: personaAutora(),
    publisher: {
      '@type': 'Organization',
      '@id':   `${SITE_URL}/#organization`,
      name:    'Su Finca Raíz',
      url:      SITE_URL,
      // Mismo LOGO que la entidad: antes este decía 200×60 y aquel 200×200.
      logo: { '@type': 'ImageObject', ...LOGO },
    },
    articleSection: article.category_name,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':  `${SITE_URL}/blog/${article.slug}`,
    },
  }
}

// ── FAQ Schema (reutilizable en landing pages) ────────────────────────────────
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: items.map((item) => ({
      '@type':          'Question',
      name:              item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:     item.answer,
      },
    })),
  };
}

// ── WebPage con Speakable (AEO — AI engines / voice assistants) ───────────────
export function webPageSchema(params: {
  url:                  string
  name:                 string
  description:          string
  speakable_selectors:  string[]
  about_name?:          string
  about_same_as?:       string | string[]
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'WebPage',
    '@id':        `${params.url}#webpage`,
    url:           params.url,
    name:          params.name,
    description:   params.description,
    isPartOf:     { '@id': `${SITE_URL}/#website` },
    ...(params.about_name ? {
      about: {
        '@type':  'Thing',
        name:      params.about_name,
        ...(params.about_same_as ? { sameAs: params.about_same_as } : {}),
      },
    } : {}),
    speakable: {
      '@type':       'SpeakableSpecification',
      cssSelector:    params.speakable_selectors,
    },
  }
}

// ── HowTo Schema (guías de compra, pasos de proceso) ─────────────────────────
export function howToSchema(params: {
  name:            string
  description:     string
  url:             string
  total_time?:     string     // ISO 8601, e.g. "P30D"
  estimated_cost?: string     // e.g. "3-5% del precio de compra"
  steps: { name: string; text: string }[]
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'HowTo',
    name:          params.name,
    description:   params.description,
    url:           params.url,
    ...(params.total_time ? { totalTime: params.total_time } : {}),
    ...(params.estimated_cost ? {
      estimatedCost: {
        '@type':   'MonetaryAmount',
        currency:  'COP',
        value:      params.estimated_cost,
      },
    } : {}),
    step: params.steps.map((s, i) => ({
      '@type':    'HowToStep',
      position:    i + 1,
      name:        s.name,
      text:        s.text,
    })),
  }
}

// ── Glosario / DefinedTermSet (AEO — respuestas a queries de definición) ──────
export function glossarySchema(terms: { term: string; definition: string; slug: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'DefinedTermSet',
        '@id':         `${SITE_URL}/glosario#termset`,
        name:          'Glosario de Finca Raíz — Su Finca Raíz',
        description:   'Términos del mercado inmobiliario rural y urbano en Colombia: documentos, trámites, impuestos y tipos de propiedad.',
        url:           `${SITE_URL}/glosario`,
        inLanguage:    'es-CO',
        publisher:     { '@id': `${SITE_URL}/#organization` },
        hasDefinedTerm: terms.map(t => ({
          '@type':          'DefinedTerm',
          '@id':            `${SITE_URL}/glosario#${t.slug}`,
          name:              t.term,
          description:       t.definition,
          url:              `${SITE_URL}/glosario#${t.slug}`,
          inDefinedTermSet: { '@id': `${SITE_URL}/glosario#termset` },
        })),
      },
      // FAQPage paralelo — para rich results de Google
      {
        '@type':    'FAQPage',
        '@id':      `${SITE_URL}/glosario#faq`,
        mainEntity: terms.map(t => ({
          '@type': 'Question',
          name:    `¿Qué es ${t.term} en Colombia?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:     t.definition,
          },
        })),
      },
    ],
  }
}
