import { SITE_URL } from '@/lib/site'

// ─────────────────────────────────────────────────────────────────────────────
// IndexNow — notificación inmediata a Bing (y por tanto a Copilot).
//
// Es indexación en minutos en vez de semanas, gratis, y prácticamente nadie en
// el sector inmobiliario colombiano lo usa. Yandex y Seznam también lo consumen;
// Google no participa, así que para Google seguimos dependiendo del sitemap.
//
// LA CLAVE ES PÚBLICA POR DISEÑO. No es un secreto: se sirve en
// /<clave>.txt en la raíz del dominio, y ese archivo es justamente la prueba de
// que quien notifica controla el sitio. Por eso vive en el código y no en una
// variable de entorno.
//
// ⚠ SI CAMBIAS ESTA CLAVE, renombra también
//   public/41675c118a4309caf9c83b8d8f0229a3.txt
// y actualiza su contenido. Si las dos se separan, IndexNow rechaza las
// notificaciones en silencio y nadie se entera hasta que alguien mire los logs.
//
// FALLA EN SILENCIO. Un error de IndexNow NUNCA puede romper la publicación de
// una propiedad o un artículo: es una optimización, no parte de la operación.
// Todo queda en el log del servidor para poder auditarlo.
// ─────────────────────────────────────────────────────────────────────────────

export const INDEXNOW_KEY = '41675c118a4309caf9c83b8d8f0229a3'

const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS = 10_000 // tope del protocolo por petición

/**
 * Notifica a IndexNow que estas URLs cambiaron.
 *
 * @param urls Rutas absolutas o relativas al sitio. Se normalizan a absolutas.
 * @param motivo Etiqueta para el log: qué disparó la notificación.
 */
export async function notificarIndexNow(urls: string[], motivo: string): Promise<void> {
  try {
    const host = new URL(SITE_URL).host

    const lista = [...new Set(urls)]
      .map(u => (u.startsWith('http') ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`))
      // Solo URLs de nuestro propio host: IndexNow rechaza la petición completa
      // si una sola URL pertenece a otro dominio.
      .filter(u => {
        try { return new URL(u).host === host } catch { return false }
      })
      .slice(0, MAX_URLS)

    if (!lista.length) return

    const res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key:         INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList:     lista,
      }),
      // Si tarda, se abandona: no vale la pena retrasar una publicación por esto.
      signal: AbortSignal.timeout(8000),
    })

    // 200 = aceptado. 202 = aceptado, clave pendiente de validar. Ambos van bien.
    if (res.ok) {
      console.log(`[indexnow] ${motivo}: ${lista.length} URL(s) notificadas (HTTP ${res.status}).`)
    } else {
      console.warn(`[indexnow] ${motivo}: rechazado con HTTP ${res.status}. ${await res.text().catch(() => '')}`)
    }
  } catch (err) {
    // Deliberadamente silencioso hacia arriba.
    console.warn(`[indexnow] ${motivo}: no se pudo notificar:`, err instanceof Error ? err.message : err)
  }
}

/** URL de una propiedad más las páginas de listado que la contienen. */
export function urlsDePropiedad(slug: string, municipioSlug?: string | null): string[] {
  const urls = [`/propiedad/${slug}`, '/propiedades', '/']
  if (municipioSlug) urls.push(`/municipios/${municipioSlug}`)
  return urls
}

/** URL de un artículo más el índice del blog. */
export function urlsDeArticulo(slug: string): string[] {
  return [`/blog/${slug}`, '/blog']
}
