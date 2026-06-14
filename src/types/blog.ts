// ─── Categorías predefinidas ──────────────────────────────────────────────────

export const BLOG_CATEGORIES = {
  'mercado-inmobiliario':   'Mercado Inmobiliario',
  'guias-de-compra':        'Guías de Compra',
  'vivir-en-cundinamarca':  'Vivir en Cundinamarca',
  'inversion-rural':        'Inversión Rural',
  'tramites-y-legal':       'Trámites y Legal',
  'noticias':               'Noticias',
  'comunidad':              'Comunidad',
} as const

export type BlogCategorySlug = keyof typeof BLOG_CATEGORIES

// ─── Frontmatter (lo que cada .mdx declara) ──────────────────────────────────

export interface HowToStep {
  name: string
  text: string
}

export interface PostFrontmatter {
  title:        string
  excerpt:      string
  date:         string          // ISO "YYYY-MM-DD"
  updated?:     string          // ISO "YYYY-MM-DD"
  category:     BlogCategorySlug
  tags:         string[]
  author?:      string
  cover_image?: string
  cover_alt?:   string
  featured?:    boolean
  noindex?:     boolean
  // AEO: HowTo schema para artículos de guía paso a paso
  howto_steps?:   HowToStep[]
  howto_time?:    string          // ISO 8601 duration e.g. "P30D"
  howto_cost?:    string          // e.g. "3-5% del precio de compra"
}

// ─── Post con metadata resuelta ──────────────────────────────────────────────

export interface PostMeta extends PostFrontmatter {
  slug:          string
  reading_time:  string        // "5 min de lectura"
  category_name: string
  // Aportes de la comunidad (blog colaborativo, guardados en BD)
  community?:    boolean       // true si proviene de la tabla Article
  author_photo?: string        // foto del autor (seudónimo)
  author_email?: string        // correo del autor (visible para contacto)
}

// ─── Post completo (incluye MDX source o texto plano de comunidad) ────────────

export interface Post extends PostMeta {
  content: string              // MDX (artículos) o texto plano (comunidad)
}

// ─── Página paginada ─────────────────────────────────────────────────────────

export interface PaginatedPosts {
  posts:       PostMeta[]
  total:       number
  page:        number
  totalPages:  number
  perPage:     number
}
