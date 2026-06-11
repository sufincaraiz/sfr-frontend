import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import {
  BLOG_CATEGORIES,
  type BlogCategorySlug,
  type Post,
  type PostMeta,
  type PaginatedPosts,
} from '@/types/blog'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')
const POSTS_PER_PAGE = 12

// ─── Helpers internos ────────────────────────────────────────────────────────

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true })
  }
}

function parsePost(slug: string, raw: string): PostMeta {
  const { data } = matter(raw)
  const fm = data as Record<string, unknown>

  const category = (fm['category'] as BlogCategorySlug | undefined) ?? 'noticias'
  const rt = readingTime(raw)

  return {
    slug,
    title:        String(fm['title']       ?? slug),
    excerpt:      String(fm['excerpt']      ?? ''),
    date:         String(fm['date']         ?? new Date().toISOString().slice(0, 10)),
    updated:      fm['updated'] ? String(fm['updated']) : undefined,
    category,
    category_name: BLOG_CATEGORIES[category] ?? category,
    tags:          Array.isArray(fm['tags']) ? (fm['tags'] as string[]) : [],
    author:        fm['author'] ? String(fm['author']) : 'Su Finca Raíz',
    cover_image:   fm['cover_image'] ? String(fm['cover_image']) : undefined,
    cover_alt:     fm['cover_alt']   ? String(fm['cover_alt'])   : undefined,
    featured:     Boolean(fm['featured']),
    noindex:      Boolean(fm['noindex']),
    reading_time: `${Math.max(1, Math.ceil(rt.minutes))} min de lectura`,
    // AEO fields
    howto_steps:  Array.isArray(fm['howto_steps'])
      ? (fm['howto_steps'] as { name: string; text: string }[])
      : undefined,
    howto_time:   fm['howto_time']  ? String(fm['howto_time'])  : undefined,
    howto_cost:   fm['howto_cost']  ? String(fm['howto_cost'])  : undefined,
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Todos los posts ordenados por fecha descendente (sin contenido). */
export function getAllPosts(): PostMeta[] {
  ensureContentDir()
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'))

  return files
    .map(file => {
      const slug = file.replace(/\.mdx?$/, '')
      const raw  = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
      return parsePost(slug, raw)
    })
    .filter(p => !p.noindex)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** Un post con su contenido MDX completo. */
export function getPost(slug: string): Post | null {
  ensureContentDir()
  const candidates = [
    path.join(CONTENT_DIR, `${slug}.mdx`),
    path.join(CONTENT_DIR, `${slug}.md`),
  ]
  const filePath = candidates.find(f => fs.existsSync(f))
  if (!filePath) return null

  const raw     = fs.readFileSync(filePath, 'utf-8')
  const { content } = matter(raw)
  const meta    = parsePost(slug, raw)
  return { ...meta, content }
}

/** Slugs de todos los posts (para generateStaticParams). */
export function getAllPostSlugs(): { slug: string }[] {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

/** Posts paginados. */
export function getPaginatedPosts(page = 1, perPage = POSTS_PER_PAGE): PaginatedPosts {
  const all   = getAllPosts()
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Posts destacados (featured: true), máx N. */
export function getFeaturedPosts(max = 3): PostMeta[] {
  return getAllPosts().filter(p => p.featured).slice(0, max)
}

/** Posts de una categoría, paginados. */
export function getPostsByCategory(
  category: BlogCategorySlug,
  page = 1,
  perPage = POSTS_PER_PAGE
): PaginatedPosts {
  const all   = getAllPosts().filter(p => p.category === category)
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Posts de un tag, paginados. */
export function getPostsByTag(
  tag: string,
  page = 1,
  perPage = POSTS_PER_PAGE
): PaginatedPosts {
  const normalized = tag.toLowerCase()
  const all   = getAllPosts().filter(p =>
    p.tags.some(t => t.toLowerCase() === normalized)
  )
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Todas las categorías con conteo de posts. */
export function getAllCategories(): { slug: BlogCategorySlug; name: string; count: number }[] {
  const posts = getAllPosts()
  return (Object.entries(BLOG_CATEGORIES) as [BlogCategorySlug, string][])
    .map(([slug, name]) => ({
      slug,
      name,
      count: posts.filter(p => p.category === slug).length,
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Todos los tags con conteo. */
export function getAllTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>()
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/** Posts relacionados: mismo category, distinto slug, máx N. */
export function getRelatedPosts(current: PostMeta, max = 3): PostMeta[] {
  return getAllPosts()
    .filter(p => p.slug !== current.slug && p.category === current.category)
    .slice(0, max)
}

export { POSTS_PER_PAGE }
