import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getPaginatedPosts, POSTS_PER_PAGE } from '@/lib/blog'
import { ArticleCard } from '@/components/blog/ArticleCard'
import { BlogPagination } from '@/components/blog/BlogPagination'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const { totalPages } = getPaginatedPosts(1, POSTS_PER_PAGE)
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({
    page: String(i + 2), // pages 2..N (page 1 is /blog)
  }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ page: string }> }
): Promise<Metadata> {
  const { page } = await params
  const n = parseInt(page, 10)
  return {
    title: `Blog — Página ${n} | Su Finca Raíz`,
    description: `Artículos sobre finca raíz en el Gualivá, Cundinamarca. Página ${n}.`,
    alternates: { canonical: `${SITE_URL}/blog/pagina/${n}` },
    robots: { index: false },   // paginación no indexada directamente
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogPaginaPage(
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params
  const n = parseInt(page, 10)
  if (isNaN(n) || n < 2) notFound()

  const { posts, totalPages } = getPaginatedPosts(n, POSTS_PER_PAGE)
  if (n > totalPages && totalPages > 0) notFound()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: `Página ${n}`, href: `/blog/pagina/${n}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '2.5rem 1.5rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.2rem)', marginBottom: 8 }}>
              Blog — Página {n}
            </h1>
          </div>
        </div>

        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Página {n}</span>
        </nav>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
            {posts.map(p => <ArticleCard key={p.slug} post={p} />)}
          </div>
          <BlogPagination page={n} totalPages={totalPages} baseHref="/blog/pagina" firstHref="/blog" />
        </div>
      </main>
    </>
  )
}
