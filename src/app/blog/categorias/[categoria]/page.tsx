import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getPostsByCategory } from '@/lib/blog'
import { BLOG_CATEGORIES, type BlogCategorySlug } from '@/types/blog'
import { ArticleCard } from '@/components/blog/ArticleCard'
import { BlogPagination } from '@/components/blog/BlogPagination'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return (Object.keys(BLOG_CATEGORIES) as BlogCategorySlug[]).map(slug => ({ categoria: slug }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ categoria: string }> }
): Promise<Metadata> {
  const { categoria } = await params
  const name = BLOG_CATEGORIES[categoria as BlogCategorySlug]
  if (!name) return { title: 'Categoría no encontrada | Su Finca Raíz' }

  return {
    title: `${name} — Blog | Su Finca Raíz`,
    description: `Artículos sobre ${name.toLowerCase()} en finca raíz del Gualivá, Cundinamarca.`,
    alternates: { canonical: `${SITE_URL}/blog/categorias/${categoria}` },
    openGraph: {
      title: `${name} — Blog | Su Finca Raíz`,
      description: `Artículos sobre ${name.toLowerCase()} en el mercado inmobiliario del Gualivá.`,
      url: `${SITE_URL}/blog/categorias/${categoria}`,
      type: 'website', locale: 'es_CO',
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoriaPage(
  { params }: { params: Promise<{ categoria: string }> }
) {
  const { categoria } = await params
  const name = BLOG_CATEGORIES[categoria as BlogCategorySlug]
  if (!name) notFound()

  const { posts, totalPages, total } = await getPostsByCategory(categoria as BlogCategorySlug, 1)

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: 'Categorías', href: '/blog/categorias' },
    { name: name, href: `/blog/categorias/${categoria}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2rem,5vw,3.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Categoría
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3.5vw,2.3rem)', marginBottom: 8 }}>{name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
              {total} artículo{total !== 1 ? 's' : ''} publicado{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={13} />
          <Link href="/blog/categorias" style={{ color: '#64748B', textDecoration: 'none' }}>Categorías</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{name}</span>
        </nav>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</p>
              <p style={{ color: '#475569', fontSize: '0.95rem' }}>Próximamente artículos en esta categoría.</p>
              <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: '1rem', color: '#1B56A1', fontWeight: 700, textDecoration: 'none' }}>
                ← Volver al blog
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
                {posts.map((p, i) => <ArticleCard key={p.slug} post={p} priority={i < 3} />)}
              </div>
              <BlogPagination
                page={1}
                totalPages={totalPages}
                baseHref={`/blog/categorias/${categoria}/pagina`}
                firstHref={`/blog/categorias/${categoria}`}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
