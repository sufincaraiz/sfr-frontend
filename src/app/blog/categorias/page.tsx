import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, ChevronRight } from 'lucide-react'
import { SITE_URL } from '@/lib/site'
import { getAllCategories } from '@/lib/blog'
import { BLOG_CATEGORIES } from '@/types/blog'
import { CategoryBadge } from '@/components/blog/ArticleCard'
import { JsonLd, breadcrumbSchema } from '@/components/seo/JsonLd'

export const metadata: Metadata = {
  title: 'Categorías del Blog | Su Finca Raíz',
  description: 'Explora los artículos por categoría: mercado inmobiliario, guías de compra, inversión rural, trámites y vivir en Cundinamarca.',
  alternates: { canonical: `${SITE_URL}/blog/categorias` },
}

export default async function CategoriasIndexPage() {
  const withCount = await getAllCategories()
  const countMap = Object.fromEntries(withCount.map(c => [c.slug, c.count]))

  const breadcrumbs = breadcrumbSchema([
    { name: 'Inicio', href: '/' },
    { name: 'Blog', href: '/blog' },
    { name: 'Categorías', href: '/blog/categorias' },
  ])

  const DESCRIPTIONS: Record<string, string> = {
    'mercado-inmobiliario':   'Análisis de precios, valorización, tendencias y datos del mercado inmobiliario rural en Cundinamarca.',
    'guias-de-compra':        'Paso a paso para comprar finca raíz: qué revisar, cómo negociar, qué documentos pedir.',
    'vivir-en-cundinamarca':  'Guías prácticas para vivir en La Vega, el Gualivá y el campo cundinamarqués.',
    'inversion-rural':        'Estrategias, retornos y proyecciones para invertir en finca raíz rural cerca de Bogotá.',
    'tramites-y-legal':       'Escrituración, impuestos, licencias, restricciones ambientales y trámites notariales.',
    'noticias':               'Novedades del sector, nuevos proyectos y actualizaciones del mercado del Gualivá.',
  }

  return (
    <>
      <JsonLd data={breadcrumbs} />

      <main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <div style={{ background: 'linear-gradient(135deg, #0D2D5E 0%, #1B56A1 100%)', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(1.5rem,3.5vw,2.2rem)', marginBottom: 8 }}>Categorías del Blog</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>Encuentra artículos por tema de interés</p>
        </div>

        <nav aria-label="Breadcrumb" style={{ maxWidth: 1280, margin: '0 auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#64748B', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B', textDecoration: 'none' }}><Home size={13} /> Inicio</Link>
          <ChevronRight size={13} />
          <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
          <ChevronRight size={13} />
          <span style={{ color: '#0D2D5E', fontWeight: 600 }}>Categorías</span>
        </nav>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1.5rem 5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1.25rem' }}>
            {(Object.entries(BLOG_CATEGORIES) as [string, string][]).map(([slug, name]) => {
              const count = countMap[slug] ?? 0
              return (
                <Link key={slug} href={`/blog/categorias/${slug}`} style={{ display: 'block', textDecoration: 'none' }} className="cat-card">
                  <article style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.5rem 1.75rem', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <CategoryBadge category={slug} name={name} />
                      <span style={{ background: '#F1F5F9', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                        {count} artículo{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <h2 style={{ color: '#0D2D5E', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>{name}</h2>
                    <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.65, margin: 0, flex: 1 }}>
                      {DESCRIPTIONS[slug] ?? ''}
                    </p>
                    <span style={{ color: '#1B56A1', fontWeight: 700, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                      Ver artículos <ChevronRight size={14} />
                    </span>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </main>

      <style>{`
        .cat-card article { transition: box-shadow 0.2s, transform 0.2s; }
        .cat-card:hover article { box-shadow: 0 8px 24px rgba(13,45,94,0.1); transform: translateY(-2px); }
      `}</style>
    </>
  )
}
