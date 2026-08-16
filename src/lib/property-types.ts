/**
 * Tipos de inmueble — helpers puros (client-safe, sin Prisma).
 *
 * La fuente de verdad vive en la tabla `property_types` (model TipoPropiedad),
 * pero `Property.type` sigue siendo un String libre cuyo valor es el `slug` del
 * tipo. Esta lista estática cumple dos papeles:
 *   1) semilla de la tabla (scripts/seed-tipos-propiedad.ts), y
 *   2) respaldo cuando no hay BD — build sin conexión, SSR antes de que el
 *      cliente traiga la lista real, o un fallo puntual de la consulta.
 *
 * Para leer los tipos reales usa `getTiposPropiedad()` de `property-types.server`.
 */

export interface TipoPropiedad {
  slug: string;
  label: string;
  plural: string;
  orden: number;
}

export const DEFAULT_TIPOS: TipoPropiedad[] = [
  { slug: 'finca',           label: 'Finca',           plural: 'Fincas',            orden: 10 },
  { slug: 'casa',            label: 'Casa campestre',  plural: 'Casas campestres',  orden: 20 },
  // «Condominio» NO va aquí: dejó de ser un tipo de inmueble. Es el régimen de
  // propiedad y vive en `en_condominio`. Esta lista es el respaldo de cuando la
  // base no responde, y la tenía: bastaba con eso para que el buscador siguiera
  // ofreciéndolo, y para que un rastreador lo leyera en el HTML servido.
  // Se busca en /propiedades/en-condominio.
  { slug: 'lote',            label: 'Lote',            plural: 'Lotes',             orden: 40 },
  { slug: 'lote-urbano',     label: 'Lote urbano',     plural: 'Lotes urbanos',     orden: 50 },
  { slug: 'lote-campestre',  label: 'Lote campestre',  plural: 'Lotes campestres',  orden: 60 },
  { slug: 'lote-rural',      label: 'Lote rural',      plural: 'Lotes rurales',     orden: 70 },
  { slug: 'apartamento',     label: 'Apartamento',     plural: 'Apartamentos',      orden: 80 },
  { slug: 'local',           label: 'Local comercial', plural: 'Locales comerciales', orden: 90 },
];

const DEFAULT_MAP: Record<string, TipoPropiedad> = Object.fromEntries(
  DEFAULT_TIPOS.map(t => [t.slug, t]),
);

/** "lote-campestre" → "Lote campestre". Para tipos creados desde el admin. */
export function prettifySlug(slug: string): string {
  const texto = (slug ?? '').replace(/[-_]+/g, ' ').trim();
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const CONECTORES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'con', 'para', 'a', 'al']);

/** Plural aproximado en español, palabra por palabra (salta conectores). */
export function pluralizar(label: string): string {
  return label
    .split(' ')
    .map(palabra => {
      const bajo = palabra.toLowerCase();
      if (CONECTORES.has(bajo) || !palabra) return palabra;
      if (/[aeiouáéíóú]$/i.test(palabra)) return `${palabra}s`;
      if (/z$/i.test(palabra)) return `${palabra.slice(0, -1)}ces`;
      if (/s$/i.test(palabra)) return palabra;
      return `${palabra}es`;
    })
    .join(' ');
}

/**
 * Etiqueta legible de un tipo. Si `mapa` viene de la BD se usa primero; si no,
 * cae a la lista estática y por último a prettify — así un tipo creado desde
 * el admin nunca se muestra como slug crudo.
 */
export function tipoLabel(slug: string | null | undefined, mapa?: Record<string, string>): string {
  if (!slug) return '';
  return mapa?.[slug] ?? DEFAULT_MAP[slug]?.label ?? prettifySlug(slug);
}

/** Igual que `tipoLabel` pero en plural, para títulos y encabezados. */
export function tipoPlural(slug: string | null | undefined, mapa?: Record<string, string>): string {
  if (!slug) return '';
  if (mapa?.[slug]) return mapa[slug];
  const conocido = DEFAULT_MAP[slug];
  if (conocido) return conocido.plural;
  return pluralizar(prettifySlug(slug));
}
