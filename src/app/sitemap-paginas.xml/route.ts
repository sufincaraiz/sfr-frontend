import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { urlset, respuestaXml, type EntradaSitemap } from '@/lib/sitemap-xml'

// Páginas fijas del sitio.
//
// SOBRE `lastmod` AQUÍ: la mayoría de estas páginas no tiene ninguna fecha real
// que ofrecer —su contenido vive en el código, no en la base—, así que se OMITE.
// Es deliberado: la doctrina §7 prohíbe `new Date()`, y una fecha inventada le
// dice al rastreador que vuelva a por algo que no cambió. Cuando descubre que no
// cambió, deja de creer en las fechas de todo el dominio.
//
// Las que SÍ tienen señal real la usan: /propiedades cambia cuando cambia una
// propiedad, así que su fecha es la de la propiedad modificada más recientemente.

export const revalidate = 3600

export async function GET() {
  let ultimaPropiedad: Date | null = null
  try {
    const p = await prisma.property.findFirst({
      where:   { status: 'available' },
      orderBy: { updated_at: 'desc' },
      select:  { updated_at: true },
    })
    ultimaPropiedad = p?.updated_at ?? null
  } catch (err) {
    console.warn('[sitemap-paginas] BD no disponible:', err instanceof Error ? err.message : err)
  }

  const entradas: EntradaSitemap[] = [
    { url: SITE_URL,                            lastmod: ultimaPropiedad, changefreq: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/propiedades`,           lastmod: ultimaPropiedad, changefreq: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/guia-inversion`,        changefreq: 'monthly', priority: 0.85 },
    { url: `${SITE_URL}/vender-mi-finca`,       changefreq: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/nosotros`,              changefreq: 'yearly',  priority: 0.7 },
    { url: `${SITE_URL}/contacto`,              changefreq: 'yearly',  priority: 0.7 },
    { url: `${SITE_URL}/directorio`,            changefreq: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/glosario`,              changefreq: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/terminos-y-condiciones`,     changefreq: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/politica-tratamiento-datos`, changefreq: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/politica-de-cookies`,        changefreq: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/eliminacion-de-datos`,       changefreq: 'yearly', priority: 0.3 },
  ]

  return respuestaXml(urlset(entradas))
}
