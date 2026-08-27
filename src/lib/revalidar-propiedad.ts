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
}
