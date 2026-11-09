import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * REVALIDACIÓN DE LAS RUTAS QUE DEPENDEN DE UNA PROPIEDAD
 * ======================================================
 *
 * Vivía escrita dentro de `PUT /api/admin/properties/[id]`, así que **solo
 * corría al EDITAR**. Crear una propiedad notificaba a IndexNow y no
 * revalidaba nada: la ficha nueva no aparecía en el catálogo ni en la portada
 * hasta que venciera el ISR de una hora o hubiera un despliegue.
 *
 * Es peor que el defecto de editar. Al editar, la versión vieja sigue ahí y se
 * corrige sola en una hora; al crear, **la propiedad simplemente no existe para
 * el visitante** durante ese rato, justo cuando el titular acaba de publicarla
 * y espera verla.
 *
 * Está aquí y no duplicada en los dos endpoints por la razón de siempre: dos
 * copias de la misma lista de rutas se desincronizan. Cuando aparezca la
 * séptima ruta que depende del inventario, se añade UNA vez.
 */
export function revalidarPropiedad(slug?: string | null): void {
  if (slug) revalidatePath(`/propiedad/${slug}`)
  revalidatePath('/propiedades')
  revalidatePath('/')
  // La vista por atributo depende del mismo inventario: marcar o desmarcar
  // «en condominio» cambia estas rutas aunque la ficha no cambie de sitio.
  revalidatePath('/propiedades/en-condominio')

  // ── Las hijas dinámicas ───────────────────────────────────────────────────
  // `revalidatePath('/propiedades')` revalida ESA ruta y nada más: no alcanza a
  // sus hijas dinámicas. Y ahí es donde vive el precio derivado.
  //
  // `<RangosMunicipio>` sale en las 118 páginas de `/propiedades/[filtro]`, en
  // `/propiedades/[filtro]/[municipio]` y en `/propiedades/en-condominio/
  // [municipio]`, todas con `revalidate = 3600`. Cambiar un precio actualizaba
  // la ficha y dejaba el catálogo filtrado diciendo otro durante HASTA UNA
  // HORA: la contradicción de cifras que llevamos toda la sesión eliminando,
  // sobre el dato que más importa.
  //
  // La forma con patrón de ruta —el segundo argumento 'page'— sí alcanza a
  // todas las instancias del segmento dinámico.
  revalidatePath('/propiedades/[filtro]', 'page')
  revalidatePath('/propiedades/[filtro]/[municipio]', 'page')
  revalidatePath('/propiedades/en-condominio/[municipio]', 'page')

  // `/nosotros` publica el rango de precios del catálogo con
  // `rangoPreciosCatalogo()`. Misma cifra, misma contradicción.
  revalidatePath('/nosotros')

  // Y el índice de tipos ofrecibles, que se deriva del inventario: vender la
  // última propiedad de un tipo tiene que sacarlo del buscador, y publicar la
  // primera de un tipo nuevo tiene que meterlo.
  revalidateTag('enlaces')

  // Las dos listas del BUSCADOR, cacheadas desde el 2026-10-27. Las dos salen
  // del inventario, así que es AQUÍ —al publicar o vender— donde más cambian,
  // no al editar un municipio o un tipo. Y `revalidateTag('enlaces')` de arriba
  // no las alcanza: `getTiposOfrecibles()` usa `cache()` de React, que no
  // persiste nada. Sin estas dos líneas, vender la última finca de un pueblo lo
  // dejaría en el filtro hasta una hora: el usuario filtraría y no encontraría
  // nada, que es el defecto que esas rutas existen para no tener.
  revalidatePath('/api/municipios')
  revalidatePath('/api/property-types')

  // ── Lo que faltaba al subir el reloj a 24 h (2026-11-09) ──────────────────
  // Con `revalidate = 3600` estos huecos se cerraban solos en una hora; con
  // 86400 durarían un día. Trazado por imports en INFORME-CPU-VERCEL.md,
  // apéndice §1, «Una PROPIEDAD cambia».
  //
  // Municipio y vereda cuentan y listan las propiedades que tienen. Con la
  // forma de patrón alcanza a todas las instancias: la propiedad puede haber
  // cambiado DE municipio o de vereda, y entonces caducan las dos.
  revalidatePath('/municipios/[slug]', 'page')
  revalidatePath('/veredas/[slug]', 'page')
  // Las cuatro citan el total del catálogo (`contarPropiedadesDisponibles`,
  // `inventario()`), y `/registro-visita` lista las propiedades en su selector.
  revalidatePath('/mac')
  revalidatePath('/preguntas-frecuentes')
  revalidatePath('/registro-visita')
  for (const ruta of RUTAS_DE_RASTREADOR) revalidatePath(ruta)
}

/**
 * Los route handlers que publican inventario y los leen solo rastreadores y
 * modelos. Una ficha nueva que no aparece en el sitemap en un día es una ficha
 * que el buscador tarda un día más en descubrir.
 */
export const RUTAS_DE_RASTREADOR = [
  '/llms.txt',
  '/sitemap-propiedades.xml',
  '/sitemap-imagenes.xml',
  '/sitemap-paginas.xml',
  // Las veredas promocionadas por inventario (`veredasPublicables`) nacen y
  // mueren con las propiedades asignadas.
  '/sitemap-municipios.xml',
] as const
