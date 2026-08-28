/**
 * SLUGS — lógica pura, sin imports
 * ================================
 *
 * Módulo hoja para que `scripts/probar-slug.ts` ejercite el generador real y no
 * una copia. `utils.ts` importa cadenas que arrastran alias `@/…`, así que
 * importar desde ahí rompe la ejecución con Node; esto no importa nada. Es el
 * mismo patrón de `busqueda-texto.ts` y `valor-futuro.ts`.
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Slug BASE de una propiedad, sin resolver colisiones (eso lo hace el endpoint,
 * que es quien puede consultar la base).
 *
 * El generador anterior era `${tipo}-${slugify(title)}-${muni}-cundinamarca`, y
 * cuando el título empezaba por el tipo salía el prefijo DUPLICADO:
 * `apartamento-apartamento-nuevo-en-conjunto-…`. Cinco de las 36 fichas lo
 * tienen así.
 *
 * Regla: no se antepone el tipo si el título YA empieza por él, con LÍMITE DE
 * PALABRA —igual a `tipoSlug` o empieza por `tipoSlug + "-"`—. Así:
 *   · «Apartamento nuevo» (type apartamento) → no duplica.
 *   · «Casablanca» (type casa) → SÍ antepone «casa-», porque «casablanca» no
 *     empieza por «casa-». Sin el límite de palabra, «casa» se comería el
 *     prefijo de «Casablanca».
 */
export function slugBasePropiedad(title: string, tipoSlug: string, muniSlug: string): string {
  const t = slugify(title);
  const empiezaPorTipo = t === tipoSlug || t.startsWith(`${tipoSlug}-`);
  const conTipo = empiezaPorTipo ? t : `${tipoSlug}-${t}`;
  return `${conTipo}-${muniSlug}-cundinamarca`;
}
