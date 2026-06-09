import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { Hero }               from '@/components/home/Hero';
import { FeaturedProperties } from '@/components/home/FeaturedProperties';
import { StatsSection }       from '@/components/home/StatsSection';
import { ValueProp }          from '@/components/home/ValueProp';
import { Tour360Section }     from '@/components/home/Tour360Section';
import { AboutUs }            from '@/components/home/AboutUs';
import { FAQ }                from '@/components/home/FAQ';
import { JsonLd, localBusinessSchema } from '@/components/seo/JsonLd';
import { SEED_PROPERTIES }    from '@/lib/seed-properties';
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
async function getFeaturedProperties(): Promise<Property[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/api/properties?featured=true&limit=6`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return SEED_PROPERTIES;
    const data = await res.json() as { properties: Property[] };
    const props = data.properties ?? [];
    return props.length > 0 ? props : SEED_PROPERTIES;
  } catch {
    return SEED_PROPERTIES;
  }
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
