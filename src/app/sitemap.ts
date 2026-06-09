import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Rutas estáticas ────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/propiedades`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // ── Propiedades disponibles ────────────────────────────────────────────────
  const properties = await prisma.property.findMany({
    where:  { status: 'available' },
    select: { slug: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
  })

  const propertyRoutes: MetadataRoute.Sitemap = properties.map(p => ({
    url:             `${SITE_URL}/propiedad/${p.slug}`,
    lastModified:    p.updated_at,
    changeFrequency: 'weekly',
    priority:        0.8,
  }))

  return [...staticRoutes, ...propertyRoutes]
}
