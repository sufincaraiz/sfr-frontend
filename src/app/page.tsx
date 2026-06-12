import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { Hero }               from '@/components/home/Hero';
import { FeaturedProperties } from '@/components/home/FeaturedProperties';
import { StatsSection }       from '@/components/home/StatsSection';
import { ValueProp }          from '@/components/home/ValueProp';
import { Tour360Section }     from '@/components/home/Tour360Section';
import { AboutUs }            from '@/components/home/AboutUs';
import { FAQ }                from '@/components/home/FAQ';
import { JsonLd, localBusinessSchema, faqSchema, webPageSchema } from '@/components/seo/JsonLd';
import { HOME_FAQS } from '@/lib/faq-data';
import { prisma }            from '@/lib/prisma';
import type { Property }      from '@/types';

// ─── Metadata específica de la homepage ───────────────────────────────────────
// Máx. 60 chars ↓ (53 chars)
// "Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz"
// Máx. 155 chars ↓ (146 chars)
// "Compra fincas, lotes y casas campestres en La Vega, Cundinamarca.
//  +100 propiedades verificadas a 2 h de Bogotá. Asesórate gratis: ☎ 321 882 6730."

export const metadata: Metadata = {
  title: 'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
  description:
    'Compra fincas, lotes y casas campestres en La Vega, Cundinamarca. ' +
    '+100 propiedades verificadas a 2 h de Bogotá. Asesórate gratis: ☎ 321 882 6730.',

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    title:       'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
    description:
      'Fincas, lotes y casas campestres en La Vega y el Gualivá. ' +
      '+100 propiedades verificadas a solo 2 horas de Bogotá.',
    url:    SITE_URL,
    images: [
      {
        url:    '/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg',
        width:   1200,
        height:  630,
        alt:    'Fincas en venta en La Vega, Cundinamarca — Su Finca Raíz',
        type:   'image/jpeg',
      },
    ],
  },
};

// ─── Fetch propiedades destacadas ─────────────────────────────────────────────
const FEATURED_COUNT = 14;  // 2 filas de 7 para los carruseles de la home

async function getFeaturedProperties(): Promise<Property[]> {
  // Fuente única de verdad: la misma BD que usan /propiedades y la ficha de
  // detalle. Antes esta función consultaba un backend externo con fallback a
  // SEED_PROPERTIES (slugs viejos duplicados), lo que producía enlaces 404.
  //
  // Selección con variedad de tipos: traemos todas las disponibles ordenadas
  // por fecha y luego intercalamos por tipo (round-robin) para no llenar las 6
  // tarjetas con un solo tipo. Si un tipo se agota, las rondas siguientes lo
  // saltan y completan con los demás hasta llegar a 6.
  const rows = await prisma.property.findMany({
    where:   { status: 'available' },
    orderBy: [{ published_at: 'desc' }],
    include: {
      municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
      media:        { orderBy: { order: 'asc' }, take: 6 },
    },
  });

  // Agrupar por tipo conservando el orden por fecha dentro de cada grupo
  const byType = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byType.get(r.type) ?? [];
    list.push(r);
    byType.set(r.type, list);
  }

  // Round-robin: una propiedad de cada tipo por ronda hasta llenar FEATURED_COUNT
  const queues = [...byType.values()];
  const selected: typeof rows = [];
  let exhausted = false;
  while (selected.length < FEATURED_COUNT && !exhausted) {
    exhausted = true;
    for (const q of queues) {
      if (selected.length >= FEATURED_COUNT) break;
      const next = q.shift();
      if (next) { selected.push(next); exhausted = false; }
    }
  }

  return selected.map(r => ({
    id:                r.id,
    slug:              r.slug,
    type:              r.type as Property['type'],
    transaction_type:  'venta' as const,
    municipality_id:   r.municipality_id,
    vereda_id:         r.vereda_id,
    address_visible:   r.address_visible,
    price_cop:         Number(r.price_cop),
    area_lot_m2:       r.area_lot_m2,
    area_built_m2:     r.area_built_m2,
    bedrooms:          r.bedrooms,
    bathrooms:         r.bathrooms,
    parking:           r.parking,
    year_built:        r.year_built,
    status:            r.status as Property['status'],
    geo_lat:           r.geo_lat,
    geo_lng:           r.geo_lng,
    published_at:      r.published_at.toISOString(),
    updated_at:        r.updated_at.toISOString(),
    title:             r.title ?? undefined,
    short_description: r.short_description ?? undefined,
    meta_title:        r.meta_title ?? undefined,
    meta_description:  r.meta_description ?? undefined,
    municipality:      r.municipality ?? undefined,
    media:             r.media as Property['media'],
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const featuredProperties = await getFeaturedProperties();

  return (
    <>
      {/*
        JSON-LD inyectado en el <head> via Next.js App Router.
        Contiene @graph con: RealEstateAgent + WebSite (SearchAction).
      */}
      <JsonLd data={localBusinessSchema()} />
      <JsonLd data={faqSchema(HOME_FAQS)} />
      <JsonLd data={webPageSchema({
        url:                 SITE_URL,
        name:                'Fincas en Venta La Vega, Cundinamarca | Su Finca Raíz',
        description:         'Compra fincas, lotes y casas campestres en La Vega, Cundinamarca. +100 propiedades verificadas a 2 h de Bogotá.',
        speakable_selectors: ['.sfr-speakable', 'h1', '#preguntas-frecuentes'],
        about_name:          'Finca raíz en La Vega, Cundinamarca',
        about_same_as:       'https://es.wikipedia.org/wiki/La_Vega_(Cundinamarca)',
      })} />

      <Hero />
      <FeaturedProperties properties={featuredProperties} />
      <Tour360Section />
      <StatsSection />
      <ValueProp />
      <AboutUs />
      <FAQ />
    </>
  );
}
