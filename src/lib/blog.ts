import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import { prisma } from '@/lib/prisma'
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
    howto_steps:  Array.isArray(fm['howto_steps'])
      ? (fm['howto_steps'] as { name: string; text: string }[])
      : undefined,
    howto_time:   fm['howto_time']  ? String(fm['howto_time'])  : undefined,
    howto_cost:   fm['howto_cost']  ? String(fm['howto_cost'])  : undefined,
  }
}

/** Posts de archivos MDX/MD (artículos oficiales). */
function getMdxPosts(): PostMeta[] {
  ensureContentDir()
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
  return files.map(file => {
    const slug = file.replace(/\.mdx?$/, '')
    const raw  = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
    return parsePost(slug, raw)
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbArticleToMeta(a: any): PostMeta {
  const date = (a.published_at ?? a.created_at ?? new Date()).toISOString().slice(0, 10)
  const rt = readingTime(a.content ?? '')
  return {
    slug:          a.slug,
    title:         a.title,
    excerpt:       a.excerpt ?? '',
    date,
    category:      'comunidad',
    category_name: BLOG_CATEGORIES['comunidad'],
    tags:          [],
    author:        a.author_name ?? 'Anónimo',
    cover_image:   a.cover_image_url ?? undefined,
    featured:      false,
    noindex:       false,
    reading_time:  `${Math.max(1, Math.ceil(rt.minutes))} min de lectura`,
    community:     true,
    author_photo:  a.author_photo_url ?? undefined,
    author_email:  a.author_email ?? undefined,
  }
}

/** Posts de la comunidad (tabla Article en BD). */
async function getCommunityPosts(): Promise<PostMeta[]> {
  try {
    const rows = await prisma.article.findMany({
      where:   { published_at: { not: null } },
      orderBy: { published_at: 'desc' },
    })
    return rows.map(dbArticleToMeta)
  } catch (err) {
    console.error('[blog] error leyendo artículos de comunidad:', err)
    return []
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/** Todos los posts (MDX + comunidad) ordenados por fecha descendente. */
export async function getAllPosts(): Promise<PostMeta[]> {
  const [mdx, community] = await Promise.all([
    Promise.resolve(getMdxPosts()),
    getCommunityPosts(),
  ])
  return [...mdx, ...community]
    .filter(p => !p.noindex)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/** Un post con su contenido (MDX o texto plano de comunidad). */
export async function getPost(slug: string): Promise<Post | null> {
  ensureContentDir()
  const candidates = [
    path.join(CONTENT_DIR, `${slug}.mdx`),
    path.join(CONTENT_DIR, `${slug}.md`),
  ]
  const filePath = candidates.find(f => fs.existsSync(f))
  if (filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { content } = matter(raw)
    const meta = parsePost(slug, raw)
    return { ...meta, content }
  }

  // Si no es MDX, buscar en la tabla de comunidad
  const article = await prisma.article.findUnique({ where: { slug } })
  if (article && article.published_at) {
    return { ...dbArticleToMeta(article), content: article.content }
  }
  return null
}

/** Slugs de todos los posts (para generateStaticParams). */
export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  return (await getAllPosts()).map(p => ({ slug: p.slug }))
}

/** Posts paginados. */
export async function getPaginatedPosts(page = 1, perPage = POSTS_PER_PAGE): Promise<PaginatedPosts> {
  const all   = await getAllPosts()
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total, page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Posts destacados (featured: true), máx N. */
export async function getFeaturedPosts(max = 3): Promise<PostMeta[]> {
  return (await getAllPosts()).filter(p => p.featured).slice(0, max)
}

/** Posts de una categoría, paginados. */
export async function getPostsByCategory(category: BlogCategorySlug, page = 1, perPage = POSTS_PER_PAGE): Promise<PaginatedPosts> {
  const all   = (await getAllPosts()).filter(p => p.category === category)
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total, page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Posts de un tag, paginados. */
export async function getPostsByTag(tag: string, page = 1, perPage = POSTS_PER_PAGE): Promise<PaginatedPosts> {
  const normalized = tag.toLowerCase()
  const all   = (await getAllPosts()).filter(p => p.tags.some(t => t.toLowerCase() === normalized))
  const total = all.length
  const start = (page - 1) * perPage
  return {
    posts:      all.slice(start, start + perPage),
    total, page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

/** Todas las categorías con conteo de posts. */
export async function getAllCategories(): Promise<{ slug: BlogCategorySlug; name: string; count: number }[]> {
  const posts = await getAllPosts()
  return (Object.entries(BLOG_CATEGORIES) as [BlogCategorySlug, string][])
    .map(([slug, name]) => ({ slug, name, count: posts.filter(p => p.category === slug).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Todos los tags con conteo. */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const map = new Map<string, number>()
  for (const post of await getAllPosts()) {
    for (const tag of post.tags) map.set(tag, (map.get(tag) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/** Posts relacionados: misma categoría, distinto slug, máx N. */
export async function getRelatedPosts(current: PostMeta, max = 3): Promise<PostMeta[]> {
  return (await getAllPosts())
    .filter(p => p.slug !== current.slug && p.category === current.category)
    .slice(0, max)
}

export { POSTS_PER_PAGE }
