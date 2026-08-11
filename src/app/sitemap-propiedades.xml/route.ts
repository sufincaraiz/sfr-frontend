import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { urlset, respuestaXml, type EntradaSitemap } from '@/lib/sitemap-xml'

// Propiedades ACTIVAS. Las vendidas o retiradas quedan fuera: la doctrina §7
// exige que una propiedad vendida salga del sitemap, porque seguir ofreciéndola
// a un rastreador es exactamente la clase de dato caduco que hace que un modelo
// deje de confiar en el inventario del sitio.
//
// `lastmod` sale de `updated_at` de la base. Nunca de new Date().

export const revalidate = 3600

export async function GET() {
  let filas: { slug: string; updated_at: Date }[] = []
  try {
    filas = await prisma.property.findMany({
      where:   { status: 'available' },
      select:  { slug: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    })
  } catch (err) {
    console.warn('[sitemap-propiedades] BD no disponible:', err instanceof Error ? err.message : err)
  }

  const entradas: EntradaSitemap[] = filas.map(p => ({
    url:        `${SITE_URL}/propiedad/${p.slug}`,
    lastmod:    p.updated_at,
    changefreq: 'weekly',
    priority:   0.8,
  }))

  return respuestaXml(urlset(entradas))
}
