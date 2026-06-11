import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, Tag } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getPostsByTag, getAllTags } from '@/lib/blog'
import { ArticleCard } from '@/components/blog/ArticleCard'
import { BlogPagination } from '@/components/blog/BlogPagination'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── SSG ─────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getAllTags().map(({ tag }) => ({ tag: encodeURIComponent(tag.toLowerCase()) }))
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ tag: string }> }
): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  return {
    title: `Artículos sobre "${decoded}" | Blog Su Finca Raíz`,
    description: `Todos los artículos etiquetados con "${decoded}" en el blog de Su Finca Raíz.`,
    alternates: { canonical: `${SITE_URL}/blog/tags/${tag}` },
    robots: { index: false },   // tags no se indexan directamente
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TagPage(
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const { posts, totalPages, total } = getPostsByTag(decoded, 1)

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: decoded, href: `/blog/tags/${tag}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
            <Tag size={18} style={{ color: '#E8B92F' }} />
            <span style={{ color: '#E8B92F', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Tag</span>
          </div>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.2rem)', marginBottom: 6 }}>
            {decoded}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
            {total} artículo{total !== 1 ? 's' : ''}
          </p>
        </div>

        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>{decoded}</span>
        </nav>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '1rem' }}>
                No hay artículos con el tag &ldquo;{decoded}&rdquo; todavía.
              </p>
              <Link href="/blog" style={{ color: '#1B56A1', fontWeight: 700, textDecoration: 'none' }}>← Volver al blog</Link>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1.25rem' }}>
                {posts.map(p => <ArticleCard key={p.slug} post={p} />)}
              </div>
              <BlogPagination page={1} totalPages={totalPages} baseHref={`/blog/tags/${tag}/pagina`} firstHref={`/blog/tags/${tag}`} />
            </>
          )}
        </div>
      </main>
    </>
  )
}
