import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL } from '@/lib/site'
import { getAllPosts, getAllCategories } from '@/lib/blog'
import { getAllMunicipiosData } from '@/lib/municipios-data'
import { getAllVeredasData } from '@/lib/veredas-data'
import { BLOG_CATEGORIES, type BlogCategorySlug } from '@/types/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {

  // ── 1. Rutas estáticas core ────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/propiedades`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/municipios`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/veredas`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/blog`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.85 },
    { url: `${SITE_URL}/blog/categorias`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contacto`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.7 },
    { url: `${SITE_URL}/nosotros`,          lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.65 },
    { url: `${SITE_URL}/vender-mi-finca`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/glosario`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.72 },
  ]

  // ── 2. Propiedades disponibles ─────────────────────────────────────────────
  const properties = await prisma.property.findMany({
    where:   { status: 'available' },
    select:  { slug: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
  })
  const propertyRoutes: MetadataRoute.Sitemap = properties.map(p => ({
    url:             `${SITE_URL}/propiedad/${p.slug}`,
    lastModified:    p.updated_at,
    changeFrequency: 'weekly',
    priority:        0.8,
  }))

  // ── 3. Municipios ──────────────────────────────────────────────────────────
  const municipioRoutes: MetadataRoute.Sitemap = getAllMunicipiosData().map(m => ({
    url:             `${SITE_URL}/municipios/${m.slug}`,
    lastModified:    new Date(),
    changeFrequency: 'monthly',
    priority:        0.78,
  }))

  // ── 4. Veredas ────────────────────────────────────────────────────────────
  const veredaRoutes: MetadataRoute.Sitemap = getAllVeredasData().map(v => ({
    url:             `${SITE_URL}/veredas/${v.slug}`,
    lastModified:    new Date(),
    changeFrequency: 'monthly',
    priority:        0.70,
  }))

  // ── 5. Blog: categorías ───────────────────────────────────────────────────
  const blogCatRoutes: MetadataRoute.Sitemap = (Object.keys(BLOG_CATEGORIES) as BlogCategorySlug[]).map(slug => ({
    url:             `${SITE_URL}/blog/categorias/${slug}`,
    lastModified:    new Date(),
    changeFrequency: 'weekly',
    priority:        0.65,
  }))

  // ── 6. Blog: artículos ────────────────────────────────────────────────────
  const posts = getAllPosts()
  const blogPostRoutes: MetadataRoute.Sitemap = posts.map(p => ({
    url:             `${SITE_URL}/blog/${p.slug}`,
    lastModified:    new Date(p.updated ?? p.date),
    changeFrequency: 'monthly',
    priority:        0.65,
  }))

  return [
    ...staticRoutes,
    ...propertyRoutes,
    ...municipioRoutes,
    ...veredaRoutes,
    ...blogCatRoutes,
    ...blogPostRoutes,
  ]
}
