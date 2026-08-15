import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, ChevronRight, Store } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema, itemListSchema } from '@/components/seo/JsonLd';
import { DirectorioClient } from './DirectorioClient';
import type { Business } from '@/lib/directorio';
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta';
import { respuestaDirectorio } from '@/lib/respuestas-directas';

// Era force-dynamic sin necesitarlo: la pagina es indexable, esta en el
// sitemap y su contenido —nueve negocios locales— no cambia por minuto. Con
// force-dynamic, Vercel respondia private/no-store y cada rastreo bajaba a
// Railway. Una hora de revalidacion cubre de sobra la frescura.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Directorio de Negocios Recomendados en La Vega',
  description:
    'Directorio de negocios locales recomendados en La Vega y la región del Gualivá, Cundinamarca: ' +
    'restaurantes, ferreterías, droguerías, viveros y más, con WhatsApp y ubicación.',
  alternates: { canonical: `${SITE_URL}/directorio` },
  openGraph: {
    title: 'Directorio de Negocios Recomendados en La Vega | Su Finca Raíz',
    description: 'Negocios locales recomendados en La Vega y el Gualivá: restaurantes, ferreterías, droguerías, viveros y más.',
    url: `${SITE_URL}/directorio`,
    type: 'website',
    locale: 'es_CO',
  },
};

export default async function DirectorioPage() {
  const respuesta = await respuestaDirectorio();
  let businesses: Business[] = [];
  try {
    businesses = await prisma.business.findMany({ orderBy: [{ nombre: 'asc' }] }) as Business[];
  } catch (err) {
    console.error('[directorio] error:', err);
  }

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Directorio', href: '/directorio' },
  ]);

  // Los negocios no tienen ficha propia en el sitio, así que van como nodos
  // LocalBusiness embebidos en vez de enlaces. El google_maps_url va en sameAs:
  // es lo que permite a un modelo cruzar cada negocio con la entidad que ya
  // conoce de Google, en lugar de tratarlo como un nombre suelto.
  const listado = itemListSchema({
    url:  `${SITE_URL}/directorio`,
    name: 'Directorio de negocios recomendados en La Vega y el Gualivá, Cundinamarca',
    description:
      'Negocios locales de La Vega y la Provincia del Gualivá recomendados por ' +
      'Su Finca Raíz: restaurantes, ferreterías, droguerías y viveros.',
    orden: 'asc',   // alfabético por nombre, igual que la consulta
    items: businesses.map(b => ({
      name: b.nombre,
      item: {
        '@type': 'LocalBusiness',
        name:     b.nombre,
        ...(b.descripcion ? { description: b.descripcion } : {}),
        address: {
          '@type':         'PostalAddress',
          addressLocality:  b.municipio,
          addressRegion:   'Cundinamarca',
          addressCountry:  'CO',
        },
        ...(b.google_maps_url ? { sameAs: b.google_maps_url } : {}),
        ...(b.imagen_url ? { image: b.imagen_url } : {}),
      },
    })),
  });

  return (
    <>
      <JsonLd data={breadcrumbs} />
      {businesses.length > 0 && <JsonLd data={listado} />}
      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* Hero */}
        <section style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.5rem,7vw,4rem) 1.5rem' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16, letterSpacing: 1, textTransform: 'uppercase' }}>
              <Store size={12} /> Directorio
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,4vw,2.7rem)', lineHeight: 1.15, marginBottom: 14 }}>
              Negocios recomendados en La Vega
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontSize: '1rem', maxWidth: 600, margin: '0 auto' }}>
              Restaurantes, ferreterías, droguerías, viveros y más — los aliados locales de confianza
              en La Vega y la región del Gualivá, Cundinamarca.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <RespuestaDirecta {...respuesta} />
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1180, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Directorio</span>
        </nav>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '1.5rem 1.5rem 5rem' }}>
          <DirectorioClient businesses={businesses} />
        </div>
      </main>
    </>
  );
}
