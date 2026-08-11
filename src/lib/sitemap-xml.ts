// ─────────────────────────────────────────────────────────────────────────────
// Generación de sitemaps XML segmentados.
//
// Se escriben a mano en vez de usar MetadataRoute.Sitemap de Next por dos
// motivos: Next solo produce un sitemap por ruta `sitemap.ts` (o índices
// numerados tipo /sitemap/0.xml), y no admite la extensión de imágenes, que sí
// necesitamos para el sitemap de fotos de propiedades.
//
// TODO EN MEMORIA. No se escribe nada en disco: ese patrón provocó un fallo
// ENOENT en producción y está prohibido.
//
// REGLA DE `lastmod` (doctrina §7): la fecha sale SIEMPRE de un campo real
// —`updated_at` de la base o el frontmatter del MDX— y nunca de `new Date()`.
// Una fecha de modificación inventada le dice al rastreador que vuelva a por
// contenido que no ha cambiado, y cuando descubre que no cambió deja de creer
// en las fechas de todo el sitio. Donde no hay fecha real, se OMITE el `lastmod`:
// omitirlo es honesto, falsearlo no.
// ─────────────────────────────────────────────────────────────────────────────

export interface EntradaSitemap {
  url: string
  /** Fecha REAL de última modificación. Se omite si no existe. */
  lastmod?: Date | string | null
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
  /** Imágenes asociadas (extensión image de Google). */
  imagenes?: { url: string; titulo?: string; caption?: string }[]
}

/** Escapa lo que XML no admite dentro de un nodo de texto o una URL. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const iso = (d: Date | string): string =>
  (typeof d === 'string' ? new Date(d) : d).toISOString()

/** Documento `<urlset>` con soporte para la extensión de imágenes. */
export function urlset(entradas: EntradaSitemap[]): string {
  const conImagenes = entradas.some(e => e.imagenes?.length)
  const cuerpo = entradas
    .map(e => {
      const partes = [`    <loc>${esc(e.url)}</loc>`]
      if (e.lastmod) partes.push(`    <lastmod>${iso(e.lastmod)}</lastmod>`)
      if (e.changefreq) partes.push(`    <changefreq>${e.changefreq}</changefreq>`)
      if (e.priority != null) partes.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
      for (const img of e.imagenes ?? []) {
        partes.push('    <image:image>')
        partes.push(`      <image:loc>${esc(img.url)}</image:loc>`)
        if (img.titulo) partes.push(`      <image:title>${esc(img.titulo)}</image:title>`)
        if (img.caption) partes.push(`      <image:caption>${esc(img.caption)}</image:caption>`)
        partes.push('    </image:image>')
      }
      return `  <url>\n${partes.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${conImagenes ? '\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''}>
${cuerpo}
</urlset>`
}

/** Documento `<sitemapindex>` que apunta a los sitemaps hijos. */
export function sitemapindex(hijos: { url: string; lastmod?: Date | string | null }[]): string {
  const cuerpo = hijos
    .map(h => {
      const partes = [`    <loc>${esc(h.url)}</loc>`]
      if (h.lastmod) partes.push(`    <lastmod>${iso(h.lastmod)}</lastmod>`)
      return `  <sitemap>\n${partes.join('\n')}\n  </sitemap>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${cuerpo}
</sitemapindex>`
}

/** Respuesta XML con la cabecera y el cacheado correctos. */
export function respuestaXml(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}

/** La más reciente de una lista de fechas, o null si no hay ninguna. */
export function masReciente(fechas: (Date | null | undefined)[]): Date | null {
  const validas = fechas.filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
  if (!validas.length) return null
  return validas.reduce((a, b) => (a > b ? a : b))
}
