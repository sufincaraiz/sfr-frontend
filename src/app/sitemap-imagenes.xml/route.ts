import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { urlset, respuestaXml, type EntradaSitemap } from '@/lib/sitemap-xml'

// Sitemap de imágenes: la foto de portada de cada propiedad activa, con título y
// descripción. Google Imágenes es una superficie de descubrimiento que en finca
// raíz pesa mucho —la gente busca «finca con vista La Vega» y entra por la foto—
// y las fotos de Cloudinary no se descubren solas desde el HTML.

export const revalidate = 3600

export async function GET() {
  let filas: {
    slug: string
    title: string | null
    updated_at: Date
    municipality: { name: string } | null
    media: { url: string; alt_text: string }[]
  }[] = []

  try {
    filas = await prisma.property.findMany({
      where:   { status: 'available' },
      orderBy: { updated_at: 'desc' },
      select: {
        slug: true, title: true, updated_at: true,
        municipality: { select: { name: true } },
        // La portada: la marcada como principal o, si no hay, la primera.
        media: {
          where:   { type: 'image' },
          orderBy: [{ is_primary: 'desc' }, { order: 'asc' }],
          take:    1,
          select:  { url: true, alt_text: true },
        },
      },
    })
  } catch (err) {
    console.warn('[sitemap-imagenes] BD no disponible:', err instanceof Error ? err.message : err)
  }

  const entradas: EntradaSitemap[] = filas.flatMap(p => {
    const portada = p.media[0]
    if (!portada) return [] // propiedad sin fotos: no entra al sitemap de imágenes
    const muni = p.municipality?.name ?? 'La Vega'
    const titulo = p.title ?? p.slug
    return [{
      url:     `${SITE_URL}/propiedad/${p.slug}`,
      lastmod: p.updated_at,
      imagenes: [{
        url:     portada.url,
        titulo,
        caption: portada.alt_text || `${titulo} — ${muni}, Cundinamarca`,
      }],
    }]
  })

  return respuestaXml(urlset(entradas))
}
