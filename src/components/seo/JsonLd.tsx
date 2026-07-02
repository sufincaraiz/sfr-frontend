import { SITE_URL } from '@/lib/site';

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

// ── Organización + RealEstateAgent (homepage) ──────────────────────────────────
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    // @graph permite incluir múltiples entidades en un solo bloque JSON-LD
    '@graph': [

      // ── 1. RealEstateAgent / LocalBusiness ────────────────────────────────
      {
        '@type': ['RealEstateAgent', 'LocalBusiness'],
        '@id': `${SITE_URL}/#organization`,

        name: 'Su Finca Raíz',
        alternateName: 'Inmobiliaria Su Finca Raíz',
        slogan: 'La primera inmobiliaria inteligente de La Vega y el Gualivá',
        description:
          'Su Finca Raíz — la primera inmobiliaria inteligente de La Vega, ' +
          'Cundinamarca y la región del Gualivá. Centro de Inversión Inmobiliaria ' +
          'con agente IA (Mac) 24/7 multilingüe, recorridos virtuales 360°, ' +
          'recomendaciones inteligentes de propiedades, renderización de proyectos ' +
          'y realidad aumentada mediante alianza con Constructora Conarc.',

        url:   SITE_URL,
        logo: {
          '@type':  'ImageObject',
          url:      `${SITE_URL}/images/logo-su-finca-raiz-blanco.png`,
          width:    200,
          height:   200,
        },
        image: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`,

        // ── Contacto ─────────────────────────────────────────────────────────
        telephone: '+573218826730',
        email:     'sufincaraiz.comercial@gmail.com',

        // ── Dirección física ─────────────────────────────────────────────────
        address: {
          '@type':          'PostalAddress',
          streetAddress:    'Calle 21 #2-18 Los Naranjos',
          addressLocality:  'La Vega',
          addressRegion:    'Cundinamarca',
          postalCode:       '253051',
          addressCountry:   'CO',
        },

        // ── Coordenadas GPS exactas — La Vega, Cundinamarca ──────────────────
        geo: {
          '@type':    'GeoCoordinates',
          latitude:   4.9929,
          longitude: -74.3404,
        },

        // ── Horario de atención ───────────────────────────────────────────────
        openingHoursSpecification: [
          {
            '@type':      'OpeningHoursSpecification',
            dayOfWeek:    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens:        '08:00',
            closes:       '18:00',
          },
          {
            '@type':      'OpeningHoursSpecification',
            dayOfWeek:    'Saturday',
            opens:        '09:00',
            closes:       '14:00',
          },
        ],

        // ── Zona de cobertura — 10 municipios del Gualivá ────────────────────
        areaServed: [
          {
            '@type': 'City',
            name:    'La Vega',
            containedInPlace: {
              '@type': 'AdministrativeArea',
              name:    'Cundinamarca',
              containedInPlace: { '@type': 'Country', name: 'Colombia' },
            },
          },
          { '@type': 'City', name: 'Sasaima' },
          { '@type': 'City', name: 'Nocaima' },
          { '@type': 'City', name: 'Villeta' },
          { '@type': 'City', name: 'San Francisco' },
          { '@type': 'City', name: 'Supatá' },
          { '@type': 'City', name: 'El Peñón' },
          { '@type': 'City', name: 'Útica' },
          { '@type': 'City', name: 'Vergara' },
          { '@type': 'City', name: 'Guayabal de Síquima' },
        ],

        // ── Catálogo de servicios ─────────────────────────────────────────────
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name:    'Servicios Inmobiliarios Su Finca Raíz',
          itemListElement: [
            {
              '@type': 'Offer',
              itemOffered: {
                '@type':       'Service',
                name:          'Venta de Fincas en La Vega y el Gualivá',
                description:
                  'Fincas productivas y de recreo desde 1 hasta 50 hectáreas. ' +
                  'Acceso vial, agua y servicios. Municipios: La Vega, Sasaima, ' +
                  'Nocaima, Villeta, San Francisco y más.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type':       'Service',
                name:          'Venta de Lotes Campestres en Cundinamarca',
                description:
                  'Lotes rurales y urbanizables con escritura, libres de ' +
                  'restricciones. Ideales para construcción de finca o inversión.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type':       'Service',
                name:          'Venta de Casas Campestres y Cabañas',
                description:
                  'Casas de campo, cabañas y casas de recreo con alta ' +
                  'proyección de valorización a menos de 2 horas de Bogotá.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type':       'Service',
                name:          'Venta de Condominios Campestres',
                description:
                  'Proyectos de condominios y parcelaciones exclusivas con ' +
                  'vigilancia 24/7, zonas comunes y vías pavimentadas en La Vega.',
              },
            },
            {
              '@type': 'Offer',
              itemOffered: {
                '@type':       'Service',
                name:          'Asesoría Integral en Compraventa de Finca Raíz',
                description:
                  'Acompañamiento completo: avalúo comercial, negociación, ' +
                  'escrituración notarial, trámites de financiación y entrega.',
              },
            },
          ],
        },

        // ── Rango de precios (señal de relevancia para búsquedas comerciales) ─
        priceRange: 'COP 50.000.000 – COP 5.000.000.000',
        currenciesAccepted: 'COP',

        // ── Punto de contacto para ventas ─────────────────────────────────────
        contactPoint: [
          {
            '@type':             'ContactPoint',
            telephone:           '+573218826730',
            contactType:         'sales',
            availableLanguage:   'Spanish',
            areaServed:          'CO',
          },
          {
            '@type':             'ContactPoint',
            telephone:           '+573218826730',
            contactType:         'customer-service',
            availableLanguage:   'Spanish',
          },
        ],

        // ── Perfiles en redes sociales (señal de autoridad de marca) ──────────
        sameAs: [
          'https://www.instagram.com/sufincaraizlavega/',
          'https://www.facebook.com/inmobiliariasufincaraiz',
          'https://www.tiktok.com/@sufincaraiz',
          'https://www.youtube.com/@sufincaraiz_lavega',
        ],

        // ── Temáticas de expertise para E-E-A-T ──────────────────────────────
        knowsAbout: [
          'inteligencia artificial inmobiliaria',
          'fincas La Vega Cundinamarca',
          'inversión inmobiliaria Gualivá',
          'recorridos virtuales 360',
          'proyectos de parcelación',
          'realidad aumentada construcción',
          'Compraventa de fincas en Cundinamarca',
          'Lotes campestres en La Vega',
          'Casas de recreo cerca de Bogotá',
          'Condominios campestres Gualivá',
          'Valorización de finca raíz rural en Colombia',
          'Escrituración y trámites notariales en Colombia',
          'Financiación de inmuebles rurales',
        ],
      },

      // ── 2. WebSite con SearchAction (Sitelinks Searchbox en Google) ────────
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
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: {
      '@type': 'Organization',
      '@id':   `${SITE_URL}/#organization`,
      name:    'Su Finca Raíz',
      url:      SITE_URL,
      logo: {
        '@type':  'ImageObject',
        url:      `${SITE_URL}/images/logo-su-finca-raiz-blanco.png`,
        width:    200,
        height:   60,
      },
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
