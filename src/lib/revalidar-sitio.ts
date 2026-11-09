import { revalidatePath, revalidateTag } from 'next/cache'
import { revalidarPropiedad, RUTAS_DE_RASTREADOR } from '@/lib/revalidar-propiedad'

/**
 * REVALIDACIÓN BAJO DEMANDA DEL RESTO DEL CONTENIDO
 * =================================================
 *
 * El 2026-11-09 el reloj de las páginas públicas pasó de 3600 a 86400. El
 * reloj de una hora tapaba cualquier ruta que un endpoint olvidara
 * revalidar; con 24 h, cada olvido es un día de contenido viejo. Por eso la
 * frescura deja de depender del reloj y pasa a depender de estas funciones.
 * El reloj queda solo como red de seguridad.
 *
 * Las propiedades viven en `revalidar-propiedad.ts`. Aquí está el resto, en
 * un solo sitio por la misma razón: dos copias de una lista de rutas se
 * desincronizan.
 */

/** El artículo y las cinco vistas del blog que lo listan, más su sitemap. */
export function revalidarArticulo(slug?: string | null): void {
  if (slug) revalidatePath(`/blog/${slug}`)
  revalidatePath('/blog')
  revalidatePath('/blog/pagina/[page]', 'page')
  revalidatePath('/blog/tags/[tag]', 'page')
  revalidatePath('/blog/categorias')
  revalidatePath('/blog/categorias/[categoria]', 'page')
  revalidatePath('/sitemap-blog.xml')
}

/**
 * Un MUNICIPIO caduca casi todo el sitio: la portada (pie), su página, el
 * índice, los filtros por municipio, la malla de veredas, la ficha (que
 * muestra su municipio), las FAQ, `/nosotros`, la guía, `llms.txt` y dos
 * sitemaps. Enumerar eso es la lista que tarde o temprano se queda corta, y se
 * edita pocas veces al mes: aquí cuesta menos invalidarlo todo que olvidar una
 * ruta. Cada página se regenera UNA vez, la primera vez que alguien la pide.
 */
export function revalidarTodoElSitio(): void {
  // Todas las páginas que cuelgan del layout raíz, es decir, todas.
  revalidatePath('/', 'layout')
  // Los route handlers no tienen layout: se nombran uno a uno.
  for (const ruta of RUTAS_DE_RASTREADOR) revalidatePath(ruta)
  revalidatePath('/sitemap-blog.xml')
  revalidatePath('/api/municipios')
  revalidatePath('/api/property-types')
  revalidateTag('enlaces')
  revalidateTag('veredas')
}

/**
 * Asignar propiedades a veredas cambia `vereda_id` de cada propiedad, así
 * que caduca lo mismo que editarla: la ficha, su vereda, su municipio, los
 * filtros y los sitemaps.
 */
export function revalidarAsignacionVeredas(slugs: Array<string | null | undefined>): void {
  for (const slug of slugs) if (slug) revalidatePath(`/propiedad/${slug}`)
  revalidarPropiedad()
  revalidatePath('/veredas')
  revalidateTag('veredas')
}
