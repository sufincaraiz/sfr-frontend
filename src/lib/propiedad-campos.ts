/**
 * QUÉ CAMPOS DE UNA PROPIEDAD PUEDE ESCRIBIR EL ADMIN — lista blanca
 * =================================================================
 *
 * Los dos endpoints hacían `const updateData: any = { ...rest }` con lo que
 * llegara del cliente y se lo pasaban a Prisma. **Sin lista blanca**: quien
 * tuviera sesión de admin podía escribir CUALQUIER columna del modelo,
 * `slug`, `published_at` o `municipality_id` incluidos, aunque ningún
 * formulario los ofreciera. No es higiene, es superficie de ataque: basta una
 * petición a mano.
 *
 * El `slug` en particular es la clave de la URL pública y de las
 * revalidaciones; cambiarlo desde fuera rompe enlaces entrantes, el sitemap y
 * los avisos a IndexNow, en silencio.
 *
 * Esta lista es la ÚNICA fuente de qué se puede escribir. Se usa en el POST y
 * en el PUT, y por eso vive aquí y no duplicada en los dos.
 */

import { Prisma } from '@prisma/client'

/**
 * Campos editables desde el panel. `slug`, `published_at`, `municipality_id`,
 * `updated_at` y las relaciones quedan FUERA a propósito: los derivan o los
 * gestionan los endpoints, no el cliente.
 *
 * El `satisfies` es la guarda: si alguien renombra o elimina una de estas
 * columnas en `schema.prisma`, el `tsc` del build falla aquí en vez de dejar
 * que el campo se ignore en silencio. Es el mismo patrón de `publicable.ts`.
 */
export const CAMPOS_EDITABLES = [
  'title',
  'type',
  'en_condominio',
  'transaction_type',
  'status',
  'price_cop',
  'area_lot_m2',
  'area_built_m2',
  'bedrooms',
  'bathrooms',
  'parking',
  'year_built',
  'geo_lat',
  'geo_lng',
  'address_visible',
  'vereda_id',
  'short_description',
  'description',
  'meta_title',
  'meta_description',
  'video_url',
  'virtual_tour_url',
  'modelo3d_url',
] as const satisfies ReadonlyArray<keyof Prisma.PropertyUncheckedUpdateInput>

export type CampoEditable = (typeof CAMPOS_EDITABLES)[number]

const PERMITIDOS = new Set<string>(CAMPOS_EDITABLES)

/**
 * Se queda con lo permitido y devuelve además lo que se descartó, para poder
 * registrarlo. Un campo rechazado en silencio es un formulario que parece
 * guardar y no guarda — el defecto que nos costó esta sesión.
 */
export function filtrarCampos(entrada: Record<string, unknown>): {
  datos: Record<string, unknown>
  descartados: string[]
} {
  const datos: Record<string, unknown> = {}
  const descartados: string[] = []
  for (const [k, v] of Object.entries(entrada)) {
    if (PERMITIDOS.has(k)) datos[k] = v
    else descartados.push(k)
  }
  return { datos, descartados }
}

/**
 * `null` NO es lo mismo que cadena vacía, y el formulario de edición los
 * confundía: cargaba `d.campo ?? ''` y devolvía `''` para un campo que estaba
 * en `null`, así que abrir y guardar sin tocar nada convertía nulos en cadenas
 * vacías en cinco columnas.
 *
 * Aquí se normaliza al revés: una cadena vacía en un campo de texto opcional
 * se guarda como `null`, que es lo que significa «no hay dato». Así el estado
 * de la base no depende de si alguien abrió el formulario.
 */
const TEXTO_OPCIONAL = new Set<string>([
  'address_visible', 'short_description', 'description',
  'meta_title', 'meta_description', 'video_url', 'virtual_tour_url', 'modelo3d_url',
])

export function vaciosANull(datos: Record<string, unknown>): Record<string, unknown> {
  const salida: Record<string, unknown> = { ...datos }
  for (const k of Object.keys(salida)) {
    if (TEXTO_OPCIONAL.has(k) && typeof salida[k] === 'string' && salida[k].trim() === '') {
      salida[k] = null
    }
  }
  return salida
}
