import type { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { PropiedadesGrid }    from '@/components/propiedades/PropiedadesGrid';
import { FiltrosPropiedades } from '@/components/propiedades/FiltrosPropiedades';
import { Paginacion }         from '@/components/propiedades/Paginacion';
import { SkeletonCards }      from '@/components/propiedades/SkeletonCards';
import { TYPE_LABELS }        from '@/lib/utils';
import type { Property }      from '@/types';

export const metadata: Metadata = {
  title: 'Propiedades en Venta | La Vega Cundinamarca | Su Finca Raíz',
  description: 'Fincas, lotes, casas campestres, condominios y apartamentos en venta en La Vega, Cundinamarca. Más de 24 propiedades verificadas. ☎ 321 882 6730.',
};

const LIMIT = 12;

interface SearchParams {
  tipo?:       string;
  municipio?:  string;
  maxPrecio?:  string;
  page?:       string;
}

async function fetchProperties(sp: SearchParams) {
  const page  = Math.max(1, parseInt(sp.page ?? '1'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { status: 'available' };

  if (sp.tipo && sp.tipo !== 'todos')           where.type = sp.tipo;
  if (sp.maxPrecio)                              where.price_cop = { lte: BigInt(sp.maxPrecio) };
  if (sp.municipio && sp.municipio !== 'todos') {
    where.municipality = { name: { contains: sp.municipio, mode: 'insensitive' } };
  }

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: [{ published_at: 'desc' }],
      include: {
        municipality: { select: { id: true, slug: true, name: true, province: true, demand_score: true } },
        media:        { orderBy: { order: 'asc' }, take: 6 },
      },
    }),
    prisma.property.count({ where }),
  ]);

  // Serializar BigInt
  const properties: Property[] = rows.map(r => ({
    id:               r.id,
    slug:             r.slug,
    type:             r.type as Property['type'],
    transaction_type: 'venta' as const,
    municipality_id:  r.municipality_id,
    vereda_id:        r.vereda_id,
    address_visible:  r.address_visible,
    price_cop:        Number(r.price_cop),
    area_lot_m2:      r.area_lot_m2,
    area_built_m2:    r.area_built_m2,
    bedrooms:         r.bedrooms,
    bathrooms:        r.bathrooms,
    parking:          r.parking,
    year_built:       r.year_built,
    status:           r.status as Property['status'],
    geo_lat:          r.geo_lat,
    geo_lng:          r.geo_lng,
    published_at:     r.published_at.toISOString(),
    updated_at:       r.updated_at.toISOString(),
    title:            r.title ?? undefined,
    short_description: r.short_description ?? undefined,
    meta_title:       r.meta_title ?? undefined,
    meta_description: r.meta_description ?? undefined,
    municipality:     r.municipality ?? undefined,
    media:            r.media as Property['media'],
  }));

  return { properties, total, page, pages: Math.ceil(total / LIMIT) };
}

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp   = await searchParams;
  const data = await fetchProperties(sp);

  const heading = sp.tipo
    ? `${TYPE_LABELS[sp.tipo] ?? sp.tipo}s en Venta${sp.municipio ? ` en ${sp.municipio}` : ' en Cundinamarca'}`
    : `Propiedades en Venta${sp.municipio ? ` en ${sp.municipio}` : ' · La Vega y el Gualivá'}`;

  return (
    <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {/* ── Hero compacto ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)',
        padding: '7rem 1.5rem 3rem',
        textAlign: 'center',
      }}>
        <p style={{ color: '#E8B92F', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Su Finca Raíz · La Vega, Cundinamarca
        </p>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.6rem,4vw,2.5rem)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
          {heading}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', maxWidth: 520, margin: '0 auto' }}>
          {data.total} propiedad{data.total !== 1 ? 'es' : ''} encontrada{data.total !== 1 ? 's' : ''}
        </p>
      </section>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
        {/* Filtros */}
        <Suspense fallback={null}>
          <FiltrosPropiedades />
        </Suspense>

        {/* Grid */}
        <Suspense fallback={<SkeletonCards count={LIMIT} />}>
          <PropiedadesGrid properties={data.properties} />
        </Suspense>

        {/* Paginación */}
        <Suspense fallback={null}>
          <Paginacion page={data.page} pages={data.pages} total={data.total} />
        </Suspense>
      </div>
    </main>
  );
}
