import { SITE_URL } from '@/lib/site'

/**
 * Imágenes de Open Graph (previsualización al compartir en WhatsApp, Facebook, X…).
 *
 * Dos reglas que hay que respetar sí o sí:
 *  - La URL debe ser ABSOLUTA. WhatsApp descarta las relativas.
 *  - La imagen debe pesar poco. Los originales de Cloudinary rondan los
 *    370–500 KB y WhatsApp deja de renderizar la preview por encima de
 *    ~300 KB; cuando eso pasa, el scraper cae a otra imagen de la página
 *    (típicamente el twitter:image heredado del layout) y se ve la genérica.
 *    Con la transformación de abajo la misma foto baja a ~85–230 KB.
 *
 * Además, forzar 1200x630 hace que og:image:width/height sean verdad: antes se
 * declaraba ese tamaño sobre el original, que tenía cualquier otra proporción.
 */

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** Imagen del sitio, para cuando un contenido no tiene portada propia. */
export const OG_FALLBACK = `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`

// c_fill + g_auto recorta al sujeto sin deformar; f_auto le entrega JPEG al
// scraper de WhatsApp (verificado) y formatos modernos a los navegadores.
const OG_TRANSFORM = `c_fill,g_auto,w_${OG_WIDTH},h_${OG_HEIGHT},f_auto,q_auto`

// Prefijos de parámetros de transformación de Cloudinary. Sirven para distinguir
// un segmento de transformación de una carpeta del public_id (ej. "blog/foto.png").
const PARAM_CLOUDINARY = /^(c|w|h|f|q|g|ar|dpr|e|b|r|o|fl|bo|co|x|y|z|l|u|t|a)_/

function esTransformacion(segmento: string): boolean {
  if (/^v\d+$/.test(segmento)) return false // "v1785284836" es la versión, no una transformación
  return segmento.split(',').every(p => PARAM_CLOUDINARY.test(p))
}

/**
 * Devuelve la URL absoluta y optimizada para usar como og:image.
 * Acepta URLs de Cloudinary, URLs absolutas de otros dominios y rutas
 * relativas del propio sitio. Si no hay imagen, devuelve la genérica.
 */
export function ogImageUrl(raw?: string | null): string {
  const url = (raw ?? '').trim()
  if (!url) return OG_FALLBACK

  // Cloudinary: reemplazamos cualquier transformación previa por la de OG, para
  // no encadenarlas (las portadas del blog ya vienen con f_auto,q_auto,c_limit).
  const i = url.indexOf('/upload/')
  if (url.includes('res.cloudinary.com') && i !== -1) {
    const base = url.slice(0, i)
    const partes = url.slice(i + '/upload/'.length).split('/')
    if (partes.length > 1 && partes[0] && esTransformacion(partes[0])) partes.shift()
    return `${base}/upload/${OG_TRANSFORM}/${partes.join('/')}`
  }

  // Absoluta de otro dominio: se respeta tal cual.
  if (/^https?:\/\//i.test(url)) return url

  // Ruta del propio sitio (ej. "/eventos/foto.webp") → absoluta.
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/** El objeto `images` listo para `openGraph`, con el tamaño ya declarado. */
export function ogImageMeta(raw?: string | null, alt?: string) {
  return [{
    url: ogImageUrl(raw),
    width: OG_WIDTH,
    height: OG_HEIGHT,
    ...(alt ? { alt } : {}),
  }]
}
