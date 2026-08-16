import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';
import { DEFAULT_TIPOS, pluralizar, type TipoPropiedad } from '@/lib/property-types';
// catalogo.ts solo importa prisma y tipos: no hay ciclo.
import { tiposConInventario } from '@/lib/catalogo';

/**
 * Tipos de inmueble desde la BD, ordenados. Resiliente: si la consulta falla
 * (build sin BD, P1001) devuelve la lista estática en vez de romper la página
 * — mismo criterio que `getMunicipiosVisibles`.
 *
 * `cache()` deduplica la consulta dentro de un mismo render de servidor.
 */
export const getTiposPropiedad = cache(async (opciones?: { incluirOcultos?: boolean }): Promise<TipoPropiedad[]> => {
  try {
    const rows = await prisma.tipoPropiedad.findMany({
      where: opciones?.incluirOcultos ? undefined : { oculto: false },
      orderBy: [{ orden: 'asc' }, { label: 'asc' }],
      select: { slug: true, label: true, plural: true, orden: true },
    });
    if (!rows.length) return DEFAULT_TIPOS;
    return rows.map(r => ({
      slug: r.slug,
      label: r.label,
      plural: r.plural || pluralizar(r.label),
      orden: r.orden,
    }));
  } catch (err) {
    console.error('[getTiposPropiedad]', err);
    return DEFAULT_TIPOS;
  }
});

/**
 * Tipos que se OFRECEN AL CLIENTE: visibles en el catálogo Y con inventario.
 *
 * El desplegable público ofrecía Lote urbano, Lote rural, Lote campestre y
 * Local comercial con cero propiedades cada uno. El cliente elegía y no
 * encontraba nada: el mismo fallo que dejar los condominios sin vía de
 * búsqueda, por el otro extremo.
 *
 * El admin NO usa esto —allí se crean las propiedades, así que necesita el
 * catálogo entero—, y por eso la lista completa sigue existiendo aparte.
 *
 * Si la base no responde, `getTiposPropiedad` ya cae a la lista estática; en
 * ese caso se devuelve tal cual en vez de vaciar el filtro, que dejaría al
 * buscador sin ninguna opción.
 */
export const getTiposOfrecibles = cache(async (): Promise<TipoPropiedad[]> => {
  const [tipos, conStock] = await Promise.all([
    getTiposPropiedad(),
    tiposConInventario(),
  ]);
  if (!conStock.length) return tipos;
  const vivos = new Set(conStock);
  return tipos.filter(t => vivos.has(t.slug));
});

/** Mapa slug → label para pasar a `tipoLabel()` en componentes de servidor. */
export const getTipoLabels = cache(async (): Promise<Record<string, string>> => {
  const tipos = await getTiposPropiedad({ incluirOcultos: true });
  return Object.fromEntries(tipos.map(t => [t.slug, t.label]));
});

/** Mapa slug → plural, para encabezados de listados. */
export const getTipoPlurales = cache(async (): Promise<Record<string, string>> => {
  const tipos = await getTiposPropiedad({ incluirOcultos: true });
  return Object.fromEntries(tipos.map(t => [t.slug, t.plural]));
});

/**
 * Resuelve un tipo escrito a mano en el admin ("Otro tipo…"). Si ya existe
 * (por slug o por label) devuelve el slug existente; si no, crea la fila y
 * devuelve el slug nuevo. Espejo de `resolveMunicipality`.
 */
export async function resolveTipoPropiedad(
  entrada: string,
): Promise<{ slug: string; label: string; created: boolean }> {
  const label = (entrada ?? '').trim();
  if (label.length < 2) throw new Error('Nombre de tipo inválido');

  const slug = slugify(label);
  if (!slug) throw new Error('Nombre de tipo inválido');

  const existente = await prisma.tipoPropiedad.findFirst({
    where: { OR: [{ slug }, { label: { equals: label, mode: 'insensitive' } }] },
    select: { slug: true, label: true },
  });
  if (existente) return { ...existente, created: false };

  // Los tipos nuevos van al final del selector; el admin los reordena después.
  const ultimo = await prisma.tipoPropiedad.aggregate({ _max: { orden: true } });
  const creado = await prisma.tipoPropiedad.create({
    data: {
      slug,
      label,
      plural: pluralizar(label),
      orden: (ultimo._max.orden ?? 100) + 10,
    },
    select: { slug: true, label: true },
  });
  return { ...creado, created: true };
}
