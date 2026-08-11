import { SITE_URL } from '@/lib/site'
import { sitemapindex, respuestaXml } from '@/lib/sitemap-xml'

// Índice de sitemaps. Sustituye al sitemap único que generaba app/sitemap.ts.
//
// Se segmenta por dos razones prácticas: un rastreador que solo quiere saber si
// hay propiedades nuevas descarga 30 KB en vez del sitemap entero, y en Search
// Console la cobertura y los errores se ven por segmento —«fallan las imágenes»
// en vez de «falla el sitemap»—, que es lo que permite arreglarlos.
//
// El índice NO lleva lastmod propio: la fecha real de cada segmento la declara
// el segmento, y ponerla aquí obligaría a consultar las cinco fuentes en cada
// petición del índice para no inventarla.

export const revalidate = 3600

const SEGMENTOS = [
  'sitemap-paginas.xml',
  'sitemap-propiedades.xml',
  'sitemap-municipios.xml',
  'sitemap-blog.xml',
  'sitemap-imagenes.xml',
]

export async function GET() {
  return respuestaXml(sitemapindex(SEGMENTOS.map(s => ({ url: `${SITE_URL}/${s}` }))))
}
