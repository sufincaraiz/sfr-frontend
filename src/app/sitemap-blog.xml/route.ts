import { SITE_URL } from '@/lib/site'
import { getAllPosts } from '@/lib/blog'
import { BLOG_CATEGORIES, type BlogCategorySlug } from '@/types/blog'
import { urlset, respuestaXml, masReciente, type EntradaSitemap } from '@/lib/sitemap-xml'

// Blog híbrido: artículos en MDX (content/blog) y en base de datos.
// getAllPosts ya unifica ambas fuentes y deduplica por slug.
//
// `lastmod` = `updated` del frontmatter si existe, si no la fecha de publicación.
// Ambas son fechas reales; nunca new Date().

export const revalidate = 3600

export async function GET() {
  let posts: { slug: string; date: string; updated?: string }[] = []
  try {
    posts = await getAllPosts()
  } catch (err) {
    console.warn('[sitemap-blog] no se pudieron leer los artículos:', err instanceof Error ? err.message : err)
  }

  const fechaDe = (p: { date: string; updated?: string }) => new Date(p.updated ?? p.date)

  const entradas: EntradaSitemap[] = []

  // El índice del blog cambia cuando cambia su artículo más reciente.
  entradas.push({
    url:        `${SITE_URL}/blog`,
    lastmod:    masReciente(posts.map(fechaDe)),
    changefreq: 'daily',
    priority:   0.85,
  })
  entradas.push({ url: `${SITE_URL}/blog/categorias`, changefreq: 'monthly', priority: 0.6 })

  for (const slug of Object.keys(BLOG_CATEGORIES) as BlogCategorySlug[]) {
    entradas.push({
      url:        `${SITE_URL}/blog/categorias/${slug}`,
      changefreq: 'weekly',
      priority:   0.65,
    })
  }

  for (const p of posts) {
    entradas.push({
      url:        `${SITE_URL}/blog/${p.slug}`,
      lastmod:    fechaDe(p),
      changefreq: 'monthly',
      priority:   0.7,
    })
  }

  return respuestaXml(urlset(entradas))
}
