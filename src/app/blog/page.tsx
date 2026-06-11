import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight, Rss } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getPaginatedPosts, getFeaturedPosts, getAllCategories } from '@/lib/blog'
import { BLOG_CATEGORIES } from '@/types/blog'
import { ArticleCard, CategoryBadge } from '@/components/blog/ArticleCard'
import { BlogPagination } from '@/components/blog/BlogPagination'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Blog Inmobiliario — Fincas y Propiedades en Cundinamarca | Su Finca Raíz',
  description:
    'Guías de compra, análisis de mercado, valorización, trámites y tips para ' +
    'invertir en finca raíz rural en La Vega y el Gualivá, Cundinamarca.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Blog — Finca Raíz en Cundinamarca | Su Finca Raíz',
    description:
      'Artículos sobre compraventa de fincas, inversión rural, trámites y ' +
      'vivir en La Vega y el Gualivá.',
    url: `${SITE_URL}/blog`,
    type: 'website',
    locale: 'es_CO',
    images: [{ url: `${SITE_URL}/images/la-vega/panoramica-la-vega-cundinamarca-drone.jpg`, width: 1200, height: 630 }],
  },
}

// ─── Page (SSG, revalidate por ISR cada hora en producción) ──────────────────

export const revalidate = 3600

export default function BlogIndexPage() {
  const { posts, totalPages } = getPaginatedPosts(1)
  const featured = getFeaturedPosts(3)
  const categories = getAllCategories()

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
  ])

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog Su Finca Raíz',
    description: 'Artículos sobre finca raíz rural en La Vega y el Gualivá, Cundinamarca',
    url: `${SITE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Su Finca Raíz',
      url: SITE_URL,
    },
    inLanguage: 'es-CO',
  }

  const isEmpty = posts.length === 0

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={websiteSchema} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>

        {/* ── Hero ── */}
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: 'clamp(2.5rem,7vw,4.5rem) 1.5rem' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8B92F', color: '#0D2D5E', fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
              <Rss size={11} /> Blog Inmobiliario
            </span>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.7rem,4vw,2.8rem)', lineHeight: 1.15, marginBottom: 14 }}>
              Guías y Análisis de Finca Raíz
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, fontSize: '1rem' }}>
              Todo lo que necesitas saber para comprar, vender e invertir en fincas
              y propiedades en La Vega y el Gualivá, Cundinamarca.
            </p>
          </div>
        </div>

        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Blog</span>
        </nav>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>

          {isEmpty ? (
            <EmptyState />
          ) : (
            <div className="blog-layout">

              {/* ── COLUMNA PRINCIPAL ── */}
              <div>
                {/* Featured */}
                {featured.length > 0 && (
                  <section style={{ marginBottom: '3rem' }}>
                    <SectionTitle>Artículos destacados</SectionTitle>
                    <div className="featured-grid">
                      {featured.map((p, i) => (
                        <ArticleCard key={p.slug} post={p} variant="featured" priority={i === 0} />
                      ))}
                    </div>
                  </section>
                )}

                {/* All posts grid */}
                <section>
                  <SectionTitle>Últimos artículos</SectionTitle>
                  <div className="posts-grid">
                    {posts.map((p, i) => (
                      <ArticleCard key={p.slug} post={p} priority={i < 3} />
                    ))}
                  </div>
                  <BlogPagination
                    page={1}
                    totalPages={totalPages}
                    baseHref="/blog/pagina"
                    firstHref="/blog"
                  />
                </section>
              </div>

              {/* ── SIDEBAR ── */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CategoriesSidebar categories={categories} />
                <NewsletterWidget />
                <RelatedLinksWidget />
              </aside>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .blog-layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 280px;
          gap: 3rem;
          align-items: start;
        }
        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-bottom: 0.5rem;
        }
        @media (max-width: 960px) {
          .blog-layout { grid-template-columns: 1fr !important; }
        }
        .article-card { transition: box-shadow 0.2s, transform 0.2s; }
        .article-card:hover { box-shadow: 0 8px 24px rgba(13,45,94,0.1); transform: translateY(-2px); }
        .article-card-feat { transition: box-shadow 0.2s, transform 0.2s; }
        .article-card-feat:hover { box-shadow: 0 12px 32px rgba(13,45,94,0.18); transform: translateY(-3px); }
        .article-card-h { transition: box-shadow 0.2s; }
        .article-card-h:hover { box-shadow: 0 4px 16px rgba(13,45,94,0.1); }
      `}</style>
    </>
  )
}

// ─── Widgets sidebar ──────────────────────────────────────────────────────────

function CategoriesSidebar({ categories }: { categories: { slug: string; name: string; count: number }[] }) {
  if (!categories.length) {
    // Show all defined categories even if empty
    return (
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
        <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categorías</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(Object.entries(BLOG_CATEGORIES) as [string, string][]).map(([slug, name]) => (
            <Link key={slug} href={`/blog/categorias/${slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #F1F5F9', color: '#334155', fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', background: '#FAFAFA' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CategoryBadge category={slug} name="" />
                {name}
              </span>
              <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>0</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
      <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categorías</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {categories.map(cat => (
          <Link key={cat.slug} href={`/blog/categorias/${cat.slug}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #F1F5F9', color: '#334155', fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', background: '#FAFAFA' }}>
            {cat.name}
            <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.72rem', fontWeight: 700, padding: '1px 8px', borderRadius: 10 }}>{cat.count}</span>
          </Link>
        ))}
      </div>
      <Link href="/blog/categorias" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: '0.75rem', color: '#1B56A1', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
        Ver todas las categorías <ChevronRight size={13} />
      </Link>
    </div>
  )
}

function NewsletterWidget() {
  return (
    <div style={{ background: '#0D2D5E', borderRadius: 14, padding: '1.5rem', color: '#fff' }}>
      <p style={{ color: '#E8B92F', fontWeight: 800, fontSize: '0.85rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>¿Buscas finca raíz?</p>
      <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
        Te asesoramos gratis. Conocemos cada propiedad disponible en el Gualivá.
      </p>
      <a
        href="https://wa.me/573218826730?text=Hola%2C+me+interesa+invertir+en+finca+ra%C3%ADz+en+el+Gualiv%C3%A1"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#15803D', color: '#fff', fontWeight: 700, fontSize: '0.88rem', padding: '0.7rem', borderRadius: 10, textDecoration: 'none' }}
      >
        Consultar por WhatsApp
      </a>
    </div>
  )
}

function RelatedLinksWidget() {
  const links = [
    { label: 'Fincas en venta en La Vega', href: '/fincas-en-venta-la-vega-cundinamarca' },
    { label: 'Municipios del Gualivá', href: '/municipios' },
    { label: 'Veredas de La Vega', href: '/veredas' },
    { label: 'Ver todas las propiedades', href: '/propiedades' },
  ]
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '1.25rem 1.4rem' }}>
      <p style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.9rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Enlaces de interés</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1B56A1', fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none', padding: '0.35rem 0' }}>
            <ChevronRight size={13} style={{ flexShrink: 0 }} /> {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
      <div style={{ width: 4, height: 22, background: '#E8B92F', borderRadius: 2 }} />
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{children}</h2>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</p>
      <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.3rem', marginBottom: '0.75rem' }}>
        El blog está en preparación
      </h2>
      <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
        Muy pronto publicaremos guías, análisis y tips sobre finca raíz en el Gualivá.
      </p>
      <Link href="/propiedades" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0D2D5E', color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.7rem 1.5rem', borderRadius: 10, textDecoration: 'none' }}>
        Ver propiedades disponibles <ChevronRight size={15} />
      </Link>
    </div>
  )
}
