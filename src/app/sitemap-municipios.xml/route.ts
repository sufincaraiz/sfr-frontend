import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { getAllVeredasData } from '@/lib/veredas-data'
import { urlset, respuestaXml, masReciente, type EntradaSitemap } from '@/lib/sitemap-xml'

// Municipios con página publicada + veredas.
//
// La lista de municipios se DERIVA (contenido completo + no oculto), igual que
// en el resto del sitio: es la promoción automática de la doctrina §1.2. Cuando
// alguien termina de escribir el contenido de un municipio, su página entra sola
// aquí sin que nadie toque una lista.

export const revalidate = 3600

export async function GET() {
  let municipios: { slug: string; updated_at: Date }[] = []
  try {
    municipios = await prisma.municipality.findMany({
      where: {
        oculto: false,
        altitud_msnm:        { not: null },
        distancia_bogota_km: { not: null },
        tiempo_bogota_min:   { not: null },
        temp_min:            { not: null },
        temp_max:            { not: null },
        descripcion_seo:     { not: null },
        NOT: { descripcion_seo: '' },
      },
      select:  { slug: true, updated_at: true },
      orderBy: { updated_at: 'desc' },
    })
  } catch (err) {
    console.warn('[sitemap-municipios] BD no disponible:', err instanceof Error ? err.message : err)
  }

  const entradas: EntradaSitemap[] = []

  // Índices. Su fecha real es la del municipio modificado más recientemente.
  const ultimaMuni = masReciente(municipios.map(m => m.updated_at))
  entradas.push({ url: `${SITE_URL}/municipios`, lastmod: ultimaMuni, changefreq: 'weekly', priority: 0.9 })
  // Las veredas viven en un archivo de datos, no en la base: sin fecha real que
  // ofrecer, se omite el lastmod en vez de inventarlo.
  entradas.push({ url: `${SITE_URL}/veredas`, changefreq: 'monthly', priority: 0.75 })

  for (const m of municipios) {
    entradas.push({
      url:        `${SITE_URL}/municipios/${m.slug}`,
      lastmod:    m.updated_at,
      changefreq: 'monthly',
      priority:   0.85,
    })
  }

  for (const v of getAllVeredasData()) {
    entradas.push({
      url:        `${SITE_URL}/veredas/${v.slug}`,
      changefreq: 'monthly',
      priority:   0.7,
    })
  }

  return respuestaXml(urlset(entradas))
}
