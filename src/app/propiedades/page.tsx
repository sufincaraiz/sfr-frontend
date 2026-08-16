import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL } from '@/lib/site';
import { JsonLd, breadcrumbSchema, itemListSchema } from '@/components/seo/JsonLd';
import { fetchPropiedades, resolverTipo, municipioPorNombre, LIMIT } from '@/lib/catalogo';
import { PropiedadesGrid }    from '@/components/propiedades/PropiedadesGrid';
import { FiltrosPropiedades } from '@/components/propiedades/FiltrosPropiedades';
import { Paginacion }         from '@/components/propiedades/Paginacion';
import { SkeletonCards }      from '@/components/propiedades/SkeletonCards';
import { tipoPlural }         from '@/lib/property-types';
import { getTiposOfrecibles, getTipoPlurales } from '@/lib/property-types.server';
import { getMunicipiosConInventario } from '@/lib/cobertura';
import { RespuestaDirecta } from '@/components/aeo/RespuestaDirecta';
import { respuestaPropiedades } from '@/lib/respuestas-directas';
import { fraseInventario } from '@/lib/cifras-derivadas';

// El inventario se deriva, no se escribe. Aquí decía «Más de 24 propiedades
// verificadas» con 34 en catálogo: otra cifra fija que envejece sola, hermana de
// la de «+100» que estaba en la portada.
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<SearchParams> },
): Promise<Metadata> {
  const [inventario, sp] = await Promise.all([fraseInventario(), searchParams]);

  // ── Canonical hacia la ruta limpia ──────────────────────────────────────────
  // /propiedades?municipio=Sasaima y /propiedades/sasaima son la MISMA vista.
  // Sin esto, un motor indexa las dos y reparte las señales entre ambas. La de
  // parámetros no desaparece —los filtros interactivos la producen al vuelo—
  // pero deja de competir con la limpia.
  //
  // Solo se redirige el canonical cuando los filtros se corresponden con una
  // ruta limpia existente. Un filtro de precio o una página 2 no tienen ruta
  // limpia equivalente, así que esas variantes siguen apuntando a sí mismas.
  const canonical = await canonicalDeFiltros(sp);

  return {
    title: 'Propiedades en Venta en La Vega y el Gualivá, Cundinamarca',
    description:
      'Fincas, lotes, casas campestres, condominios y apartamentos en venta en La Vega, ' +
      `Cundinamarca. ${inventario}. ☎ 321 882 6730.`,
    alternates: {
      canonical,
    },
    openGraph: {
      url: `${SITE_URL}/propiedades`,
      description:
        `Fincas, lotes, casas campestres y condominios en La Vega y el Gualivá. ${inventario}.`,
    },
    twitter: {
      description:
        `Fincas, lotes, casas campestres y condominios en La Vega y el Gualivá. ${inventario}.`,
    },
  };
}

// El tamaño de página sale de lib/catalogo: si esta vista paginara de doce y
// las rutas limpias de otra cifra, el `desde` del ItemList mentiría en una de
// las dos.


interface SearchParams {
  tipo?:       string;
  municipio?:  string;
  maxPrecio?:  string;
  page?:       string;
  /** «1» = solo propiedades dentro de un condominio. Atributo, no tipo. */
  condominio?: string;
}

/**
 * A qué URL debe apuntar el canonical de esta vista.
 *
 * Devuelve la ruta limpia cuando existe una equivalente, y `/propiedades` en
 * cualquier otro caso. Se comprueba contra la base que el municipio y el tipo
 * existan de verdad: un canonical hacia una URL que devuelve 404 es peor que no
 * declarar ninguno, porque le dice al motor que la página buena es una que no
 * está.
 */
async function canonicalDeFiltros(sp: SearchParams): Promise<string> {
  const base = `${SITE_URL}/propiedades`;

  // Una página 2 o un filtro de precio no tienen ruta limpia: se quedan donde
  // están, apuntando a sí mismas a través del catálogo sin filtrar.
  if (sp.maxPrecio || (sp.page && sp.page !== '1')) return base;

  // El atributo condominio SÍ tiene ruta limpia, con y sin municipio. Sin este
  // canonical, la casilla del buscador fabricaría una variante con parámetros
  // que compite con /propiedades/en-condominio por las mismas señales.
  // Cruzado con tipo no la tiene todavía: esa combinación se queda en la vista
  // de parámetros en vez de apuntar a una ruta que no existe.
  if (sp.condominio === '1') {
    if (sp.tipo && sp.tipo !== 'todos') return base;
    if (!sp.municipio || sp.municipio === 'todos') return `${base}/en-condominio`;
    const m = await municipioPorNombre(sp.municipio);
    return m ? `${base}/en-condominio/${m.slug}` : `${base}/en-condominio`;
  }

  if (!sp.municipio || sp.municipio === 'todos') return base;

  const muni = await municipioPorNombre(sp.municipio);
  if (!muni) return base;

  if (sp.tipo && sp.tipo !== 'todos') {
    const tipo = await resolverTipo(sp.tipo);
    if (tipo) return `${base}/${tipo.slug}/${muni.slug}`;
  }
  return `${base}/${muni.slug}`;
}

// La consulta vive en lib/catalogo.ts: la comparten esta vista y las dos rutas
// limpias. Tres copias serian tres copias que pueden divergir.
const fetchProperties = (sp: SearchParams) =>
  fetchPropiedades({
    tipo:      sp.tipo,
    municipio: sp.municipio,
    maxPrecio: sp.maxPrecio,
    enCondominio: sp.condominio === '1',
    page:      sp.page ? parseInt(sp.page) : 1,
  });

export default async function PropiedadesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [data, tipos, plurales, municipios, respuesta] = await Promise.all([
    fetchProperties(sp),
    getTiposOfrecibles(),   // solo tipos CON inventario: ver property-types.server
    getTipoPlurales(),
    getMunicipiosConInventario(), // derivado del inventario, no una lista fija
    respuestaPropiedades(),
  ]);

  const heading = sp.tipo
    ? `${tipoPlural(sp.tipo, plurales)} en Venta${sp.municipio ? ` en ${sp.municipio}` : ' en Cundinamarca'}`
    : `Propiedades en Venta${sp.municipio ? ` en ${sp.municipio}` : ' · La Vega y el Gualivá'}`;

  // ── Marcado estructurado ────────────────────────────────────────────────────
  // Esta página salía al aire sin una sola línea de JSON-LD: ni ItemList ni
  // migas de pan, siendo el catálogo la página más comercial del sitio. La
  // doctrina §5 exige ambos para toda página de listado.
  const etiquetaTipo = new Map(tipos.map(t => [t.slug, t.label]));

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio',      href: '/' },
    { name: 'Propiedades', href: '/propiedades' },
  ]);

  // El ItemList describe la página que el rastreador tiene delante: los doce de
  // esta página, numerados desde su posición real en el catálogo, y el total
  // completo en numberOfItems.
  const listado = itemListSchema({
    url:  `${SITE_URL}/propiedades`,
    name:  heading,
    numberOfItems: data.total,
    desde: (data.page - 1) * LIMIT + 1,
    orden: 'desc',   // published_at descendente, igual que la consulta
    items: data.properties.map(p => ({
      name: p.title
        ?? `${etiquetaTipo.get(p.type) ?? 'Propiedad'} en ${p.municipality?.name ?? 'La Vega'}`,
      url:  `${SITE_URL}/propiedad/${p.slug}`,
    })),
  });

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={listado} />
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
        {/* Respuesta directa solo en el catálogo SIN filtrar: describe el
            inventario completo, y sobre una vista filtrada («fincas en Sasaima»)
            contradiría al h1. Una respuesta que no cuadra con su página es peor
            que ninguna. */}
        {!sp.tipo && !sp.municipio && <RespuestaDirecta {...respuesta} />}

        {/* Filtros */}
        <Suspense fallback={null}>
          <FiltrosPropiedades
            tipos={tipos.map(t => ({ value: t.slug, label: t.label }))}
            municipios={municipios.map(m => ({ value: m.name, label: m.name }))}
          />
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
    </>
  );
}
